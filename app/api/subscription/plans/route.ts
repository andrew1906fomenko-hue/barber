import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../lib/db";
import { listPlans } from "../../../../lib/subscription";

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    return NextResponse.json({ success: true, plans: await listPlans(true) });
  } catch (error) {
    console.error("Subscription plans GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки тарифов." }, { status: 500 });
  }
}
