import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../lib/db";
import { recordDueSubscriptionNotifications } from "../../../../../lib/subscription";

export async function POST() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const created = await recordDueSubscriptionNotifications();
    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error("Subscription notifications run error:", error);
    return NextResponse.json({ success: false, error: "Не удалось проверить уведомления подписок." }, { status: 500 });
  }
}
