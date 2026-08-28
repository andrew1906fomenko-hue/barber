import { randomBytes } from "crypto";
import { initDb, normalizeClientPhone, pool, upsertClient } from "./db";
import { buildTelegramStartLink, getTelegramConfig, getTelegramUpdates, sendTelegramMessage, type TelegramUpdate } from "./telegram";

type AppointmentConnectRow = {
  id: string;
  master_id: string;
  client_name: string;
  client_phone: string;
  client_id?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
};

type TokenRow = {
  token: string;
  master_id: string;
  client_id: string;
  expires_at: string;
  used_at?: string | null;
};

type ReminderRow = {
  id: string;
  date: string;
  start_time: string;
  client_name: string;
  telegram_chat_id: string;
  service_title?: string | null;
  master_name?: string | null;
  address?: string | null;
  city?: string | null;
  timezone?: string | null;
};

const globalForTelegram = globalThis as typeof globalThis & {
  telegramPollingStarted?: boolean;
  telegramReminderStarted?: boolean;
  telegramUpdateOffset?: number;
  telegramPollingBusy?: boolean;
  telegramReminderBusy?: boolean;
};

const CONNECT_TOKEN_TTL_HOURS = 24;
const REMINDER_WINDOWS = [
  { type: "24h", minutesBefore: 24 * 60 },
  { type: "2h", minutesBefore: 2 * 60 },
];

export type TelegramReminderRunResult = {
  checked: number;
  sent: number;
  failed: number;
  busy?: boolean;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatAppointmentDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
};

const appointmentDateTime = (date: string, time: string, timeZone = "Europe/Moscow") => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0);

  try {
    const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const firstUtc = utcGuess - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(new Date(firstUtc), timeZone);
    return new Date(utcGuess - secondOffset);
  } catch {
    return new Date(`${date}T${time}:00`);
  }
};

const minutesUntil = (date: string, time: string, timeZone?: string | null) =>
  Math.round((appointmentDateTime(date, time, timeZone || "Europe/Moscow").getTime() - Date.now()) / 60000);

const shouldSendReminder = (deltaMinutes: number, reminder: (typeof REMINDER_WINDOWS)[number]) => {
  if (deltaMinutes <= 0) return false;
  const nextReminder = REMINDER_WINDOWS.find((item) => item.minutesBefore < reminder.minutesBefore);
  const lowerBound = nextReminder?.minutesBefore || 0;
  return deltaMinutes <= reminder.minutesBefore && deltaMinutes > lowerBound;
};

export async function ensureTelegramSchema() {
  await initDb();
}

export async function createTelegramConnectLink(appointmentId: string, rescheduleToken: string, clientPhone = "") {
  await ensureTelegramSchema();
  const normalizedPhone = normalizeClientPhone(clientPhone);

  const appointment = await pool.query<AppointmentConnectRow>(
    `
      SELECT
        appointments.id,
        appointments.master_id,
        appointments.client_name,
        appointments.client_phone,
        clients.id AS client_id,
        clients.telegram_chat_id,
        clients.telegram_username
      FROM appointments
      LEFT JOIN clients
        ON clients.master_id = appointments.master_id
        AND clients.normalized_phone = regexp_replace(appointments.client_phone, '\\D', '', 'g')
      WHERE appointments.id = $1
        AND (
          appointments.reschedule_token = $2
          OR ($3 <> '' AND regexp_replace(appointments.client_phone, '\\D', '', 'g') = $3)
        )
      LIMIT 1
    `,
    [appointmentId, rescheduleToken, normalizedPhone],
  );

  const row = appointment.rows[0];
  if (!row) return null;

  let clientId = row.client_id || "";
  if (!clientId) {
    clientId = (await upsertClient(row.master_id, row.client_name, row.client_phone)) || "";
  }
  if (!clientId) return null;

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CONNECT_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await pool.query(
    `
      INSERT INTO telegram_connect_tokens (master_id, client_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [row.master_id, clientId, token, expiresAt],
  );

  return {
    connected: Boolean(row.telegram_chat_id),
    username: row.telegram_username || "",
    url: buildTelegramStartLink(token),
    expiresAt,
  };
}

export async function getTelegramStatusForAppointment(appointmentId: string, rescheduleToken: string, clientPhone = "") {
  await ensureTelegramSchema();
  const normalizedPhone = normalizeClientPhone(clientPhone);
  const result = await pool.query<{ telegram_chat_id?: string; telegram_username?: string }>(
    `
      SELECT clients.telegram_chat_id, clients.telegram_username
      FROM appointments
      JOIN clients
        ON clients.master_id = appointments.master_id
        AND clients.normalized_phone = regexp_replace(appointments.client_phone, '\\D', '', 'g')
      WHERE appointments.id = $1
        AND (
          appointments.reschedule_token = $2
          OR ($3 <> '' AND regexp_replace(appointments.client_phone, '\\D', '', 'g') = $3)
        )
      LIMIT 1
    `,
    [appointmentId, rescheduleToken, normalizedPhone],
  );
  const row = result.rows[0];
  return {
    connected: Boolean(row?.telegram_chat_id),
    username: row?.telegram_username || "",
  };
}

export async function sendTestMessageForAppointment(appointmentId: string, rescheduleToken: string, clientPhone = "") {
  await ensureTelegramSchema();
  const normalizedPhone = normalizeClientPhone(clientPhone);
  const result = await pool.query<{ telegram_chat_id?: string; client_name?: string }>(
    `
      SELECT clients.telegram_chat_id, appointments.client_name
      FROM appointments
      JOIN clients
        ON clients.master_id = appointments.master_id
        AND clients.normalized_phone = regexp_replace(appointments.client_phone, '\\D', '', 'g')
      WHERE appointments.id = $1
        AND (
          appointments.reschedule_token = $2
          OR ($3 <> '' AND regexp_replace(appointments.client_phone, '\\D', '', 'g') = $3)
        )
      LIMIT 1
    `,
    [appointmentId, rescheduleToken, normalizedPhone],
  );
  const row = result.rows[0];
  if (!row?.telegram_chat_id) return false;

  await sendTelegramMessage(
    row.telegram_chat_id,
    `Тестовое сообщение FastBook${row.client_name ? ` для ${escapeHtml(row.client_name)}` : ""}. Напоминания в Telegram подключены.`,
  );
  return true;
}

async function saveTelegramChat(chatId: string, username: string, firstName: string, lastName: string) {
  await pool.query(
    `
      INSERT INTO telegram_chats (chat_id, username, first_name, last_name, last_seen_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (chat_id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        last_seen_at = NOW()
    `,
    [chatId, username, firstName, lastName],
  );
}

async function linkTelegramToken(token: string, chatId: string, username: string) {
  const tokenResult = await pool.query<TokenRow>(
    `
      SELECT token, master_id, client_id, expires_at, used_at
      FROM telegram_connect_tokens
      WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
      LIMIT 1
    `,
    [token],
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) return false;

  await pool.query(
    `
      UPDATE clients
      SET telegram_chat_id = $1,
          telegram_username = $2,
          telegram_connected_at = NOW(),
          updated_at = NOW()
      WHERE id = $3 AND master_id = $4
    `,
    [chatId, username, tokenRow.client_id, tokenRow.master_id],
  );
  await pool.query("UPDATE telegram_connect_tokens SET used_at = NOW() WHERE token = $1", [token]);
  return true;
}

async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim() || "";
  const chat = message?.chat;
  if (!chat || !text.startsWith("/start")) return;

  await ensureTelegramSchema();

  const chatId = String(chat.id);
  const username = chat.username || message.from?.username || "";
  const firstName = chat.first_name || message.from?.first_name || "";
  const lastName = chat.last_name || message.from?.last_name || "";
  await saveTelegramChat(chatId, username, firstName, lastName);

  const [, token = ""] = text.split(/\s+/, 2);
  if (!token) {
    await sendTelegramMessage(chatId, "Откройте страницу записи и нажмите «Получать напоминания в Telegram», чтобы привязать этот чат.");
    return;
  }

  const linked = await linkTelegramToken(token, chatId, username);
  await sendTelegramMessage(
    chatId,
    linked
      ? "Telegram подключен. Теперь напоминания о записи будут приходить сюда."
      : "Ссылка подключения устарела или уже использована. Создайте новую ссылку на странице записи.",
  );
}

async function pollTelegramOnce() {
  if (globalForTelegram.telegramPollingBusy) return;
  globalForTelegram.telegramPollingBusy = true;

  try {
    const updates = await getTelegramUpdates(globalForTelegram.telegramUpdateOffset);
    for (const update of updates) {
      globalForTelegram.telegramUpdateOffset = update.update_id + 1;
      await handleTelegramUpdate(update);
    }
  } catch (error) {
    console.error("Telegram polling error:", error);
  } finally {
    globalForTelegram.telegramPollingBusy = false;
  }
}

function buildReminderMessage(row: ReminderRow, type: string) {
  const place = [row.city || "", row.address || ""].filter(Boolean).join(", ");
  return [
    `Напоминание о записи ${type === "24h" ? "за 24 часа" : "за 2 часа"}`,
    "",
    `Услуга: <b>${escapeHtml(row.service_title || "Запись")}</b>`,
    `Дата: ${escapeHtml(formatAppointmentDate(row.date))}`,
    `Время: ${escapeHtml(row.start_time)}`,
    row.master_name ? `Специалист: ${escapeHtml(row.master_name)}` : "",
    place ? `Адрес: ${escapeHtml(place)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function reminderAlreadySent(appointmentId: string, reminderType: string) {
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM telegram_reminders WHERE appointment_id = $1 AND reminder_type = $2 LIMIT 1",
    [appointmentId, reminderType],
  );
  return Boolean(result.rows[0]);
}

async function markReminderSent(appointmentId: string, reminderType: string) {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO telegram_reminders (appointment_id, reminder_type)
      VALUES ($1, $2)
      ON CONFLICT (appointment_id, reminder_type) DO NOTHING
      RETURNING id
    `,
    [appointmentId, reminderType],
  );
  return Boolean(result.rows[0]);
}

export async function sendDueTelegramReminders() {
  const summary: TelegramReminderRunResult = { checked: 0, sent: 0, failed: 0 };
  if (globalForTelegram.telegramReminderBusy) return { ...summary, busy: true };
  globalForTelegram.telegramReminderBusy = true;

  try {
    await ensureTelegramSchema();
    const result = await pool.query<ReminderRow>(
      `
        SELECT
          appointments.id,
          appointments.date::text,
          appointments.start_time,
          appointments.client_name,
          clients.telegram_chat_id,
          services.title AS service_title,
          masters.name AS master_name,
          masters.address,
          masters.city,
          masters.timezone
        FROM appointments
        JOIN masters ON masters.id = appointments.master_id
        JOIN clients
          ON clients.master_id = appointments.master_id
          AND clients.normalized_phone = regexp_replace(appointments.client_phone, '\\D', '', 'g')
        LEFT JOIN services ON services.id = appointments.service_id
        WHERE COALESCE(appointments.status, 'active') <> 'cancelled'
          AND COALESCE(clients.telegram_chat_id, '') <> ''
          AND appointments.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
      `,
    );

    for (const row of result.rows) {
      for (const reminder of REMINDER_WINDOWS) {
        const delta = minutesUntil(row.date, row.start_time, row.timezone);
        if (!shouldSendReminder(delta, reminder)) continue;
        summary.checked += 1;
        if (await reminderAlreadySent(row.id, reminder.type)) continue;

        try {
          await sendTelegramMessage(row.telegram_chat_id, buildReminderMessage(row, reminder.type));
          if (await markReminderSent(row.id, reminder.type)) summary.sent += 1;
        } catch (error) {
          summary.failed += 1;
          console.error(`Telegram reminder ${reminder.type} send error for appointment ${row.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Telegram reminders error:", error);
  } finally {
    globalForTelegram.telegramReminderBusy = false;
  }

  return summary;
}

export function ensureTelegramRuntimeStarted() {
  const config = getTelegramConfig();
  if (!config.token || !config.pollingEnabled) return;

  if (!globalForTelegram.telegramPollingStarted) {
    globalForTelegram.telegramPollingStarted = true;
    void pollTelegramOnce();
    setInterval(() => void pollTelegramOnce(), 3000);
  }

  if (!globalForTelegram.telegramReminderStarted) {
    globalForTelegram.telegramReminderStarted = true;
    void sendDueTelegramReminders();
    setInterval(() => void sendDueTelegramReminders(), 60_000);
  }
}
