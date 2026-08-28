import { NextResponse } from "next/server";
import { getTelegramStatusForAppointment } from "../../../../lib/telegram-runtime";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId") || "";
    const rescheduleToken = searchParams.get("rescheduleToken") || "";
    const clientPhone = searchParams.get("clientPhone") || "";
    if (!appointmentId || (!rescheduleToken && !clientPhone)) {
      return NextResponse.json({ success: false, error: "Не указана запись." }, { status: 400 });
    }

    const status = await getTelegramStatusForAppointment(appointmentId, rescheduleToken, clientPhone);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("Telegram status error:", error);
    return NextResponse.json({ success: false, error: "Не удалось проверить Telegram." }, { status: 500 });
  }
}
