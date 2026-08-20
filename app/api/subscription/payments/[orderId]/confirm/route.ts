import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../../lib/db";
import { confirmDemoOrder } from "../../../../../../lib/subscription";

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const { orderId } = await context.params;
    const order = await confirmDemoOrder(session.master.id, orderId);
    if (!order) return NextResponse.json({ success: false, error: "Платеж не найден." }, { status: 404 });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Subscription demo payment confirm error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка подтверждения платежа." },
      { status: 500 },
    );
  }
}
