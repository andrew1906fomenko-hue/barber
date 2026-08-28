import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../lib/db";
import { sendDueTelegramReminders } from "../../../../../lib/telegram-runtime";

const isAuthorizedCronRequest = (request: Request) => {
  const secret = process.env.TELEGRAM_REMINDERS_RUN_KEY?.trim();
  if (!secret) return true;

  const { searchParams } = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return bearer === secret || searchParams.get("key") === secret;
};

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendDueTelegramReminders();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Telegram reminders run error:", error);
    return NextResponse.json({ success: false, error: "Не удалось запустить проверку напоминаний." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session && !isAuthorizedCronRequest(request)) {
      return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    }

    const result = await sendDueTelegramReminders();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Telegram reminders manual run error:", error);
    return NextResponse.json({ success: false, error: "Не удалось запустить проверку напоминаний." }, { status: 500 });
  }
}
