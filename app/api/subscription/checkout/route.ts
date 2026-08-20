import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../lib/db";
import { createCheckout } from "../../../../lib/subscription";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const body = (await request.json()) as { planId?: string; returnUrl?: string };
    if (!body.planId) return NextResponse.json({ success: false, error: "Выберите тариф." }, { status: 400 });

    const { order, plan } = await createCheckout(session.master.id, body.planId, body.returnUrl);
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        durationMonths: order.duration_months,
        status: order.status,
        paymentUrl: order.payment_url,
      },
      plan,
    });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    const message = error instanceof Error ? error.message : "Ошибка создания платежа.";
    const status = error instanceof Error && error.name === "PLAN_UNAVAILABLE" ? 409 : message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
