import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../lib/db";
import { listOrders } from "../../../../lib/subscription";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 20);
    return NextResponse.json({ success: true, payments: await listOrders(session.master.id, page, pageSize) });
  } catch (error) {
    console.error("Subscription payments GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки платежей." }, { status: 500 });
  }
}
