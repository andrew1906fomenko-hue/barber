type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    from?: {
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || "";
  const pollingEnabled = process.env.TELEGRAM_POLLING_ENABLED === "1" || process.env.TELEGRAM_POLLING_ENABLED === "true";

  return { token, username, pollingEnabled };
}

export function assertTelegramConfigured() {
  const config = getTelegramConfig();
  if (!config.token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!config.username) throw new Error("TELEGRAM_BOT_USERNAME is not set");
  return config;
}

async function telegramApi<T>(method: string, payload: Record<string, unknown>) {
  const { token } = assertTelegramConfigured();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API ${method} failed`);
  }

  return data.result as T;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  return telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export async function getTelegramUpdates(offset?: number) {
  return telegramApi<TelegramUpdate[]>("getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message"],
  });
}

export function buildTelegramStartLink(token: string) {
  const { username } = assertTelegramConfigured();
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}
