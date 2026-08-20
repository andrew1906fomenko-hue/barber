import { NextResponse } from "next/server";
import { getCurrentSubscriptionSession, mapSubscription } from "../../../../lib/subscription";

export async function GET() {
  try {
    const session = await getCurrentSubscriptionSession();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const subscription = mapSubscription(session.subscription, session.plan);
    return NextResponse.json({ success: true, hasAccess: subscription.hasAccess, subscription });
  } catch (error) {
    console.error("Subscription access-status error:", error);
    return NextResponse.json({ success: false, error: "Ошибка проверки доступа." }, { status: 500 });
  }
}
