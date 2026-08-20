import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../lib/db";
import { sendDueTelegramReminders } from "../../../../../lib/telegram-runtime";

export async function POST() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    await sendDueTelegramReminders();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram reminders manual run error:", error);
    return NextResponse.json({ success: false, error: "Не удалось запустить проверку напоминаний." }, { status: 500 });
  }
}
