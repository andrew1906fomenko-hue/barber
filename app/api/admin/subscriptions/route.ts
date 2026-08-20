import { NextResponse } from "next/server";
import { getAdminSubscription, updatePlanByAdmin, updateSubscriptionByAdmin, type SubscriptionStatus } from "../../../../lib/subscription";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId") || "";
    if (!masterId) return NextResponse.json({ success: false, error: "masterId обязателен." }, { status: 400 });

    return NextResponse.json({ success: true, ...(await getAdminSubscription(masterId)) });
  } catch (error) {
    console.error("Admin subscriptions GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки подписки." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "subscription" | "plan";
      masterId?: string;
      planId?: string;
      subscription?: {
        status?: SubscriptionStatus;
        planId?: string | null;
        trialEndsAt?: string | null;
        currentPeriodEndsAt?: string | null;
        autoRenew?: boolean;
        autoRenewPlanId?: string | null;
        cancelAtPeriodEnd?: boolean;
      };
      plan?: {
        name?: string;
        durationMonths?: number;
        priceRub?: number;
        discountPercent?: number;
        isActive?: boolean;
        sortOrder?: number;
      };
    };

    if (body.action === "plan") {
      if (!body.planId || !body.plan?.name) return NextResponse.json({ success: false, error: "Данные тарифа неполные." }, { status: 400 });
      const plan = await updatePlanByAdmin(body.planId, {
        name: body.plan.name,
        durationMonths: Number(body.plan.durationMonths || 1),
        price: Math.round(Number(body.plan.priceRub || 0) * 100),
        discountPercent: Number(body.plan.discountPercent || 0),
        isActive: body.plan.isActive !== false,
        sortOrder: Number(body.plan.sortOrder || 0),
      });
      return NextResponse.json({ success: true, plan });
    }

    if (!body.masterId || !body.subscription?.status) {
      return NextResponse.json({ success: false, error: "Данные подписки неполные." }, { status: 400 });
    }

    const subscription = await updateSubscriptionByAdmin(body.masterId, {
      status: body.subscription.status,
      planId: body.subscription.planId || null,
      trialEndsAt: body.subscription.trialEndsAt || null,
      currentPeriodEndsAt: body.subscription.currentPeriodEndsAt || null,
      autoRenew: Boolean(body.subscription.autoRenew),
      autoRenewPlanId: body.subscription.autoRenewPlanId || body.subscription.planId || null,
      cancelAtPeriodEnd: Boolean(body.subscription.cancelAtPeriodEnd),
    });
    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Admin subscriptions PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка сохранения подписки." },
      { status: 500 },
    );
  }
}
