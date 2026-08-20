import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../../../lib/db";
import { mapSubscription, setAutoRenew } from "../../../../../lib/subscription";

export async function POST() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const subscription = await setAutoRenew(session.master.id, false);
    return NextResponse.json({ success: true, subscription: mapSubscription(subscription) });
  } catch (error) {
    console.error("Auto-renew disable error:", error);
    return NextResponse.json({ success: false, error: "Ошибка отключения автопродления." }, { status: 500 });
  }
}
