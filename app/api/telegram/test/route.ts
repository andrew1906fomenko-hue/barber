import { NextResponse } from "next/server";
import { ensureTelegramRuntimeStarted, sendTestMessageForAppointment } from "../../../../lib/telegram-runtime";

export async function POST(request: Request) {
  try {
    ensureTelegramRuntimeStarted();
    const body = (await request.json()) as { appointmentId?: string; rescheduleToken?: string; clientPhone?: string };
    if (!body.appointmentId || (!body.rescheduleToken && !body.clientPhone)) {
      return NextResponse.json({ success: false, error: "Не указана запись." }, { status: 400 });
    }

    const sent = await sendTestMessageForAppointment(body.appointmentId, body.rescheduleToken || "", body.clientPhone || "");
    if (!sent) {
      return NextResponse.json({ success: false, error: "Telegram ещё не подключен." }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram test error:", error);
    return NextResponse.json({ success: false, error: "Не удалось отправить тестовое сообщение." }, { status: 500 });
  }
}
