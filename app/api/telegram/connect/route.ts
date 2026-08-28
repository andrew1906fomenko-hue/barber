import { NextResponse } from "next/server";
import { createTelegramConnectLink } from "../../../../lib/telegram-runtime";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { appointmentId?: string; rescheduleToken?: string; clientPhone?: string };
    if (!body.appointmentId || (!body.rescheduleToken && !body.clientPhone)) {
      return NextResponse.json({ success: false, error: "Не указана запись для подключения Telegram." }, { status: 400 });
    }

    const link = await createTelegramConnectLink(body.appointmentId, body.rescheduleToken || "", body.clientPhone || "");
    if (!link) {
      return NextResponse.json({ success: false, error: "Запись не найдена или ссылка редактирования устарела." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...link });
  } catch (error) {
    console.error("Telegram connect error:", error);
    return NextResponse.json({ success: false, error: "Не удалось создать ссылку подключения Telegram." }, { status: 500 });
  }
}
