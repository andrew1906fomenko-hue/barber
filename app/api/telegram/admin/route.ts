import { NextResponse } from "next/server";
import { initDb, pool } from "../../../../lib/db";
import { getTelegramConfig } from "../../../../lib/telegram";
import { ensureTelegramRuntimeStarted, sendDueTelegramReminders } from "../../../../lib/telegram-runtime";

type CountRow = { total: string };
type ConnectedClientRow = {
  name: string;
  phone: string;
  telegram_username?: string;
  telegram_connected_at?: string | null;
  master_name: string;
};

const count = async (sql: string) => Number((await pool.query<CountRow>(sql)).rows[0]?.total || 0);

export async function GET() {
  try {
    ensureTelegramRuntimeStarted();
    await initDb();
    const config = getTelegramConfig();

    const [connectedClients, knownChats, pendingTokens, sentReminders, recentClients] = await Promise.all([
      count("SELECT COUNT(*)::text AS total FROM clients WHERE COALESCE(telegram_chat_id, '') <> ''"),
      count("SELECT COUNT(*)::text AS total FROM telegram_chats"),
      count("SELECT COUNT(*)::text AS total FROM telegram_connect_tokens WHERE used_at IS NULL AND expires_at > NOW()"),
      count("SELECT COUNT(*)::text AS total FROM telegram_reminders"),
      pool.query<ConnectedClientRow>(`
        SELECT
          clients.name,
          clients.phone,
          clients.telegram_username,
          clients.telegram_connected_at::text,
          masters.name AS master_name
        FROM clients
        JOIN masters ON masters.id = clients.master_id
        WHERE COALESCE(clients.telegram_chat_id, '') <> ''
        ORDER BY clients.telegram_connected_at DESC NULLS LAST, clients.updated_at DESC
        LIMIT 10
      `),
    ]);

    return NextResponse.json({
      success: true,
      config: {
        tokenConfigured: Boolean(config.token),
        username: config.username,
        pollingEnabled: config.pollingEnabled,
        botUrl: config.username ? `https://t.me/${config.username}` : "",
      },
      stats: {
        connectedClients,
        knownChats,
        pendingTokens,
        sentReminders,
      },
      recentClients: recentClients.rows.map((client) => ({
        name: client.name,
        phone: client.phone,
        telegramUsername: client.telegram_username || "",
        telegramConnectedAt: client.telegram_connected_at || "",
        masterName: client.master_name,
      })),
    });
  } catch (error) {
    console.error("Telegram admin GET error:", error);
    return NextResponse.json({ success: false, error: "Не удалось загрузить Telegram." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action !== "run-reminders") {
      return NextResponse.json({ success: false, error: "Неизвестное действие." }, { status: 400 });
    }

    const result = await sendDueTelegramReminders();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Telegram admin POST error:", error);
    return NextResponse.json({ success: false, error: "Не удалось выполнить действие Telegram." }, { status: 500 });
  }
}
