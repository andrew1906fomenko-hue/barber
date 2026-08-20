import { NextResponse } from "next/server";
import { addMinutes, getCurrentUserAndMaster, initDb, pool, upsertClient } from "../../../lib/db";
import { assertSubscriptionAccess } from "../../../lib/subscription";

type AppointmentRow = {
  id: string;
  master_id?: string;
  service_id: string | null;
  service_ids?: string[] | null;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_telegram?: string;
  status?: string;
  notes?: string;
  reschedule_token?: string;
};

const useLocalDb = process.env.USE_LOCAL_DB === "1" || !process.env.DATABASE_URL;
const blockedTimeError = "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u0432 \u0433\u0440\u0430\u0444\u0438\u043a\u0435.";

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

const mapStatus = (status?: string) => {
  if (status === "confirmed") return "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430";
  if (status === "done") return "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430";
  if (status === "no_show_deleted") return "\u041d\u0435 \u043f\u0440\u0438\u0448\u0451\u043b";
  if (status === "no_show") return "\u041d\u0435 \u043f\u0440\u0438\u0448\u0451\u043b";
  if (status === "cancelled") return "\u041e\u0442\u043c\u0435\u043d\u0435\u043d\u0430";
  return "\u0410\u043a\u0442\u0438\u0432\u043d\u0430";
};

const normalizeStatusCode = (status?: string) => {
  if (["active", "confirmed", "done", "no_show", "no_show_deleted", "cancelled"].includes(status || "")) return status;
  return undefined;
};

const normalizeServiceIds = (serviceIds: unknown, fallbackServiceId: string | null) => {
  if (Array.isArray(serviceIds)) {
    const ids = serviceIds.filter((item): item is string => typeof item === "string" && item.length > 0);
    if (ids.length) return ids;
  }
  return fallbackServiceId ? [fallbackServiceId] : [];
};

const mapAppointment = (appointment: AppointmentRow) => ({
  id: appointment.id,
  date: appointment.date,
  time: appointment.start_time,
  start: appointment.start_time,
  end: appointment.end_time,
  client: appointment.client_name,
  phone: appointment.client_phone,
  clientName: appointment.client_name,
  clientPhone: appointment.client_phone,
  clientEmail: appointment.client_email || "",
  clientTelegram: appointment.client_telegram || "",
  serviceId: appointment.service_id || "",
  serviceIds: normalizeServiceIds(appointment.service_ids, appointment.service_id),
  status: mapStatus(appointment.status),
  statusCode: appointment.status || "active",
  archived: appointment.status === "no_show_deleted",
  notes: appointment.notes || "",
  rescheduleToken: appointment.reschedule_token || "",
});

async function isBlockedBySchedule(masterId: string, date: string, start: string, end: string) {
  const result = await pool.query<{ date: string; start_time: string; end_time: string }>(
    "SELECT id, date::text, start_time, end_time, reason FROM blocked_times WHERE master_id = $1 ORDER BY date DESC, start_time",
    [masterId],
  );
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return result.rows.some(
    (item) =>
      item.date === date &&
      intervalsOverlap(startMinutes, endMinutes, timeToMinutes(item.start_time), timeToMinutes(item.end_time)),
  );
}

async function getMasterIdFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    await initDb();
    const result = await pool.query<{ id: string }>("SELECT id FROM masters WHERE slug = $1", [slug]);
    return result.rows[0]?.id || null;
  }

  const session = await getCurrentUserAndMaster();
  return session?.master.id || null;
}

export async function GET(request: Request) {
  try {
    await initDb();
    const masterId = await getMasterIdFromRequest(request);
    if (!masterId) return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });
    const result = await pool.query<AppointmentRow>(
      useLocalDb
        ? "SELECT id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, status, notes FROM appointments WHERE master_id = $1 ORDER BY date DESC, start_time DESC"
        : `
          SELECT id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, client_email, client_telegram, status, notes
          FROM appointments
          WHERE master_id = $1
          ORDER BY date DESC, start_time DESC
        `,
      [masterId],
    );

    return NextResponse.json({ success: true, appointments: result.rows.map(mapAppointment) });
  } catch (error) {
    console.error("Appointments GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки записей." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      masterSlug?: string;
      slug?: string;
      serviceId?: string;
      serviceIds?: string[];
      date?: string;
      time?: string;
      start?: string;
      end?: string;
      client?: string;
      phone?: string;
      email?: string;
      telegram?: string;
      clientName?: string;
      clientPhone?: string;
      clientEmail?: string;
      clientTelegram?: string;
    };

    await initDb();

    let masterId: string | null = null;
    let requiredFields: Record<string, boolean> = { name: true, phone: true, email: false, telegram: false };
    const isPublicBooking = Boolean(body.masterSlug || body.slug);

    if (isPublicBooking) {
      const master = await pool.query<{ id: string; required_fields?: Record<string, boolean> }>(
        "SELECT id, required_fields FROM masters WHERE slug = $1",
        [body.masterSlug || body.slug],
      );
      masterId = master.rows[0]?.id || null;
      requiredFields = { ...requiredFields, ...(master.rows[0]?.required_fields || {}) };
    } else {
      const session = await getCurrentUserAndMaster();
      masterId = session?.master.id || null;
      requiredFields = { name: false, phone: false, email: false, telegram: false };
    }

    if (!masterId) return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });

    const selectedServiceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const serviceId = body.serviceId || selectedServiceIds[0] || null;
    const serviceIds = selectedServiceIds.length ? selectedServiceIds : serviceId ? [serviceId] : [];
    const date = body.date || "";
    const start = body.start || body.time || "";
    const clientName = (body.clientName || body.client || "").trim() || (isPublicBooking ? "" : "Без имени");
    const clientPhone = (body.clientPhone || body.phone || "").trim();
    const clientEmail = (body.clientEmail || body.email || "").trim();
    const clientTelegram = (body.clientTelegram || body.telegram || "").trim();

    if (
      !date ||
      !start ||
      (requiredFields.name && !clientName) ||
      (requiredFields.phone && !clientPhone) ||
      (requiredFields.email && !clientEmail) ||
      (requiredFields.telegram && !clientTelegram)
    ) {
      return NextResponse.json({ success: false, error: "Заполните обязательные поля записи." }, { status: 400 });
    }

    let end = body.end || "";
    if (!end && serviceId) {
      const service = await pool.query<{ duration_min: number }>("SELECT duration_min FROM services WHERE id = $1 AND master_id = $2", [
        serviceId,
        masterId,
      ]);
      end = addMinutes(start, service.rows[0]?.duration_min || 60);
    }
    if (!end) end = addMinutes(start, 60);

    if (await isBlockedBySchedule(masterId, date, start, end)) {
      return NextResponse.json({ success: false, error: blockedTimeError }, { status: 409 });
    }

    const result = await pool.query<AppointmentRow>(
      `
        INSERT INTO appointments (master_id, service_id, date, start_time, end_time, client_name, client_phone, client_email, client_telegram, service_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, client_email, client_telegram, status, reschedule_token
      `,
      [masterId, serviceId, date, start, end, clientName, clientPhone, clientEmail, clientTelegram, JSON.stringify(serviceIds)],
    );
    await upsertClient(masterId, clientName, clientPhone);

    return NextResponse.json({
      success: true,
      appointment: mapAppointment(result.rows[0]),
      notification: {
        master: "Новая запись создана. Подключите SMS/email-провайдера для реальной отправки уведомлений.",
        client: "Заявка отправлена мастеру.",
      },
    });
  } catch (error) {
    console.error("Appointments POST error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка создания записи." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      serviceId?: string;
      serviceIds?: string[];
      date?: string;
      time?: string;
      start?: string;
      end?: string;
      client?: string;
      phone?: string;
      clientName?: string;
      clientPhone?: string;
      status?: string;
      notes?: string;
      rescheduleToken?: string;
    };

    if (!body.id) return NextResponse.json({ success: false, error: "ID записи обязателен." }, { status: 400 });

    await initDb();
    const isPublicEdit = Boolean(body.rescheduleToken);
    const session = isPublicEdit ? null : await getCurrentUserAndMaster();
    if (!isPublicEdit && !session) {
      return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    }

    let targetMasterId = session?.master.id || "";
    if (isPublicEdit) {
      const target = await pool.query<{ id: string; master_id: string }>(
        "SELECT id, master_id FROM appointments WHERE id = $1 AND reschedule_token = $2",
        [body.id, body.rescheduleToken],
      );
      if (!target.rowCount) {
        return NextResponse.json({ success: false, error: "Запись не найдена или ссылка на редактирование устарела." }, { status: 404 });
      }
      targetMasterId = target.rows[0].master_id;
    }
    await assertSubscriptionAccess(targetMasterId);

    const start = body.start || body.time || "";
    const selectedServiceIds = Array.isArray(body.serviceIds)
      ? body.serviceIds.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const serviceId = body.serviceId || selectedServiceIds[0] || null;
    const serviceIds = selectedServiceIds.length ? selectedServiceIds : serviceId ? [serviceId] : [];
    let end = body.end || "";
    if (!end && serviceId) {
      const service = await pool.query<{ duration_min: number }>(
        "SELECT duration_min FROM services WHERE id = $1 AND master_id = $2",
        [serviceId, targetMasterId],
      );
      if (!service.rowCount) {
        return NextResponse.json({ success: false, error: "Выбранная услуга больше недоступна." }, { status: 400 });
      }
      end = addMinutes(start, service.rows[0]?.duration_min || 60);
    }
    if (!end) end = addMinutes(start, 60);

    if (await isBlockedBySchedule(targetMasterId, body.date || "", start, end)) {
      return NextResponse.json({ success: false, error: blockedTimeError }, { status: 409 });
    }

    const result = await pool.query<AppointmentRow>(
      isPublicEdit
        ? `
        UPDATE appointments
        SET service_id = $1, date = $2, start_time = $3, end_time = $4, client_name = $5, client_phone = $6, service_ids = $9, status = COALESCE($10, status), notes = COALESCE($11, notes)
        WHERE id = $7 AND reschedule_token = $8
        RETURNING id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, client_email, client_telegram, status, notes, reschedule_token
      `
        : `
        UPDATE appointments
        SET service_id = $1, date = $2, start_time = $3, end_time = $4, client_name = $5, client_phone = $6, service_ids = $9, status = COALESCE($10, status), notes = COALESCE($11, notes)
        WHERE id = $7 AND master_id = $8
        RETURNING id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, client_email, client_telegram, status, notes, reschedule_token
      `,
      [
        serviceId,
        body.date,
        start,
        end,
        (body.clientName || body.client || "").trim(),
        (body.clientPhone || body.phone || "").trim(),
        body.id,
        isPublicEdit ? body.rescheduleToken : session!.master.id,
        JSON.stringify(serviceIds),
        normalizeStatusCode(body.status) || null,
        body.notes === undefined ? null : body.notes,
      ],
    );

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Запись не найдена." }, { status: 404 });
    }
    if (session) {
      await upsertClient(session.master.id, body.clientName || body.client || "", body.clientPhone || body.phone || "");
    }

    return NextResponse.json({ success: true, appointment: mapAppointment(result.rows[0]) });
  } catch (error) {
    console.error("Appointments PUT error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка сохранения записи." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID записи обязателен." }, { status: 400 });

    await pool.query("DELETE FROM appointments WHERE id = $1 AND master_id = $2", [id, session.master.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Appointments DELETE error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка удаления записи." }, { status: 500 });
  }
}
