import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../../lib/db";
import { retryOrder } from "../../../../../../lib/subscription";

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const { orderId } = await params;
    const result = await retryOrder(session.master.id, orderId);
    if (!result) return NextResponse.json({ success: false, error: "Платеж не найден или уже оплачен." }, { status: 404 });
    return NextResponse.json({ success: true, order: result.order, plan: result.plan });
  } catch (error) {
    console.error("Subscription payment retry error:", error);
    const message = error instanceof Error ? error.message : "Ошибка повторной оплаты.";
    return NextResponse.json({ success: false, error: message }, { status: message.includes("not configured") ? 503 : 500 });
  }
}
