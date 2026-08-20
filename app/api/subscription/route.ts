import { NextResponse } from "next/server";
import { getCurrentSubscriptionSession, listOrders, mapSubscription } from "../../../lib/subscription";

export async function GET() {
  try {
    const session = await getCurrentSubscriptionSession();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const payments = await listOrders(session.master.id, 1, 10);
    return NextResponse.json({
      success: true,
      subscription: mapSubscription(session.subscription, session.plan),
      payments,
    });
  } catch (error) {
    console.error("Subscription GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки подписки." }, { status: 500 });
  }
}
