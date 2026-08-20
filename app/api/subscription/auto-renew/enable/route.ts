import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../lib/db";
import { mapSubscription, setAutoRenew } from "../../../../../lib/subscription";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { planId?: string };
    const subscription = await setAutoRenew(session.master.id, true, body.planId);
    return NextResponse.json({ success: true, subscription: mapSubscription(subscription) });
  } catch (error) {
    console.error("Auto-renew enable error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Ошибка включения автопродления." }, { status: 409 });
  }
}
