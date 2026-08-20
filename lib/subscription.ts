import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { getCurrentUserAndMaster, initDb, pool } from "./db";

export const subscriptionStatuses = [
  "trial",
  "active",
  "ending_soon",
  "pending_payment",
  "payment_processing",
  "payment_failed",
  "expired",
  "cancelled",
  "blocked",
  "refunded",
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type SubscriptionOrderStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
export type PaymentEventProcessingStatus = "pending" | "processed" | "failed" | "ignored";

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionRow = {
  id: string;
  master_id: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  auto_renew: boolean;
  auto_renew_plan_id: string | null;
  cancel_at_period_end: boolean;
  payment_method_token: string | null;
  provider_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionOrderRow = {
  id: string;
  master_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  duration_months: number;
  status: SubscriptionOrderStatus;
  idempotency_key: string;
  provider_payment_id: string | null;
  payment_url: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  payment_method_title: string | null;
  receipt_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PaymentProviderCreateResult = {
  providerPaymentId: string;
  paymentUrl: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  raw: Record<string, unknown>;
};

type PaymentProviderStatus = {
  providerPaymentId: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
  paymentMethodTitle?: string;
  receiptUrl?: string;
  raw: Record<string, unknown>;
};

const billingPlans = [
  { code: "month_1", name: "1 месяц", durationMonths: 1, price: 49000, discountPercent: 0, sortOrder: 10 },
  { code: "month_2", name: "2 месяца", durationMonths: 2, price: 93000, discountPercent: 5, sortOrder: 20 },
  { code: "month_3", name: "3 месяца", durationMonths: 3, price: 132000, discountPercent: 10, sortOrder: 30 },
  { code: "month_6", name: "6 месяцев", durationMonths: 6, price: 249000, discountPercent: 15, sortOrder: 40 },
  { code: "month_12", name: "12 месяцев", durationMonths: 12, price: 469000, discountPercent: 20, sortOrder: 50 },
];

export const subscriptionFeatureEnabled = () => process.env.SUBSCRIPTION_FEATURE_ENABLED !== "0";
export const autoRenewFeatureEnabled = () => process.env.SUBSCRIPTION_AUTO_RENEW_ENABLED !== "0";

export function addCalendarMonthsUtc(input: Date, months: number) {
  const source = new Date(input.getTime());
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth() + months,
    1,
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

const toIso = (value: Date) => value.toISOString();
const daysLeft = (endsAt: string | null, now = new Date()) => {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / 86400000));
};

const isPaidStatus = (status: SubscriptionStatus) => status === "active" || status === "ending_soon" || status === "trial";

export function deriveSubscriptionStatus(subscription: Pick<SubscriptionRow, "status" | "trial_ends_at" | "current_period_ends_at">, now = new Date()): SubscriptionStatus {
  if (subscription.status === "blocked" || subscription.status === "cancelled" || subscription.status === "refunded") return subscription.status;
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const periodEndsAt = subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at) : null;
  const effectiveEndsAt = periodEndsAt && (!trialEndsAt || periodEndsAt > trialEndsAt) ? periodEndsAt : trialEndsAt;

  if (!effectiveEndsAt || effectiveEndsAt.getTime() <= now.getTime()) return "expired";
  if (trialEndsAt && trialEndsAt.getTime() > now.getTime() && (!periodEndsAt || periodEndsAt.getTime() <= trialEndsAt.getTime())) return "trial";
  return daysLeft(effectiveEndsAt.toISOString(), now) <= 7 ? "ending_soon" : "active";
}

export async function ensureSubscriptionSchema() {
  await initDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      duration_months INTEGER NOT NULL CHECK (duration_months > 0),
      price INTEGER NOT NULL CHECK (price >= 0),
      currency TEXT NOT NULL DEFAULT 'RUB',
      discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_id UUID UNIQUE REFERENCES masters(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES subscription_plans(id),
      status TEXT NOT NULL DEFAULT 'trial',
      trial_started_at TIMESTAMPTZ,
      trial_ends_at TIMESTAMPTZ,
      current_period_started_at TIMESTAMPTZ,
      current_period_ends_at TIMESTAMPTZ,
      auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      auto_renew_plan_id UUID REFERENCES subscription_plans(id),
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      payment_method_token TEXT,
      provider_customer_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES subscription_plans(id),
      amount INTEGER NOT NULL CHECK (amount >= 0),
      currency TEXT NOT NULL DEFAULT 'RUB',
      duration_months INTEGER NOT NULL CHECK (duration_months > 0),
      status TEXT NOT NULL DEFAULT 'pending',
      idempotency_key TEXT UNIQUE NOT NULL,
      provider_payment_id TEXT UNIQUE,
      payment_url TEXT,
      paid_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_code TEXT,
      failure_message TEXT,
      payment_method_title TEXT,
      receipt_url TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      external_event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      processed_at TIMESTAMPTZ,
      processing_status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
      notification_type TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending',
      unique_key TEXT UNIQUE NOT NULL
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscriptions_master_idx ON subscriptions (master_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscriptions_period_ends_idx ON subscriptions (current_period_ends_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscription_orders_master_idx ON subscription_orders (master_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS subscription_orders_status_idx ON subscription_orders (status);`);

  for (const plan of billingPlans) {
    await pool.query(
      `
        INSERT INTO subscription_plans (code, name, duration_months, price, currency, discount_percent, is_active, sort_order)
        VALUES ($1, $2, $3, $4, 'RUB', $5, TRUE, $6)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          duration_months = EXCLUDED.duration_months,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          discount_percent = EXCLUDED.discount_percent,
          is_active = TRUE,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      [plan.code, plan.name, plan.durationMonths, plan.price, plan.discountPercent, plan.sortOrder],
    );
  }
}

export async function ensureTrialSubscription(masterId: string, planId: string | null = null, startDate = new Date()) {
  await ensureSubscriptionSchema();
  const existing = await pool.query<SubscriptionRow>("SELECT * FROM subscriptions WHERE master_id = $1 LIMIT 1", [masterId]);
  if (existing.rowCount) return syncSubscriptionStatus(existing.rows[0]);

  const trialMonths = Math.max(0, Number(process.env.SUBSCRIPTION_TRIAL_MONTHS || 1) || 1);
  const trialEndsAt = addCalendarMonthsUtc(startDate, trialMonths);
  const created = await pool.query<SubscriptionRow>(
    `
      INSERT INTO subscriptions (
        master_id, plan_id, status, trial_started_at, trial_ends_at, current_period_started_at, current_period_ends_at
      )
      VALUES ($1, $2, 'trial', $3, $4, $3, $4)
      RETURNING *
    `,
    [masterId, planId, toIso(startDate), toIso(trialEndsAt)],
  );
  return created.rows[0];
}

export async function syncSubscriptionStatus(subscription: SubscriptionRow) {
  const status = deriveSubscriptionStatus(subscription);
  if (status === subscription.status) return subscription;
  const updated = await pool.query<SubscriptionRow>(
    "UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, subscription.id],
  );
  return updated.rows[0] || { ...subscription, status };
}

export async function getSubscriptionForMaster(masterId: string) {
  const subscription = await ensureTrialSubscription(masterId);
  return syncSubscriptionStatus(subscription);
}

export async function listPlans(activeOnly = true) {
  await ensureSubscriptionSchema();
  const result = await pool.query<SubscriptionPlan>(
    activeOnly
      ? "SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order, duration_months"
      : "SELECT * FROM subscription_plans ORDER BY sort_order, duration_months",
  );
  return result.rows;
}

export async function getPlan(planId: string) {
  await ensureSubscriptionSchema();
  const result = await pool.query<SubscriptionPlan>(
    "SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE LIMIT 1",
    [planId],
  );
  return result.rows[0] || null;
}

export function mapSubscription(subscription: SubscriptionRow, plan?: SubscriptionPlan | null) {
  const effectiveEndsAt = subscription.current_period_ends_at || subscription.trial_ends_at;
  return {
    id: subscription.id,
    status: deriveSubscriptionStatus(subscription),
    planId: subscription.plan_id,
    planName: plan?.name || (subscription.status === "trial" ? "Бесплатный период" : "Подписка"),
    trialStartedAt: subscription.trial_started_at,
    trialEndsAt: subscription.trial_ends_at,
    currentPeriodStartedAt: subscription.current_period_started_at,
    currentPeriodEndsAt: subscription.current_period_ends_at,
    daysLeft: daysLeft(effectiveEndsAt),
    autoRenew: subscription.auto_renew,
    autoRenewPlanId: subscription.auto_renew_plan_id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    nextChargeAt: subscription.auto_renew ? subscription.current_period_ends_at : null,
    nextChargeAmount: plan?.price || null,
    nextChargeCurrency: plan?.currency || "RUB",
    featureEnabled: subscriptionFeatureEnabled(),
    autoRenewEnabled: autoRenewFeatureEnabled(),
    hasAccess: isPaidStatus(deriveSubscriptionStatus(subscription)),
  };
}

function yookassaAuthHeader() {
  return `Basic ${Buffer.from(`${process.env.PAYMENT_SHOP_ID || ""}:${process.env.PAYMENT_SECRET_KEY || ""}`).toString("base64")}`;
}

function getPaymentProvider() {
  const provider = process.env.PAYMENT_PROVIDER || "yookassa";
  if (provider !== "yookassa") throw new Error(`Unsupported payment provider: ${provider}`);
  if (!process.env.PAYMENT_SHOP_ID || !process.env.PAYMENT_SECRET_KEY || !process.env.PAYMENT_RETURN_URL) {
    return {
      name: "demo",
      async createPayment(order: SubscriptionOrderRow, plan: SubscriptionPlan, returnUrl?: string): Promise<PaymentProviderCreateResult> {
        const origin = returnUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.PAYMENT_RETURN_URL || "http://localhost:3000";
        return {
          providerPaymentId: `demo_${order.id}`,
          paymentUrl: `${origin.replace(/\/$/, "")}/dashboard?subscription_demo_order=${encodeURIComponent(order.id)}`,
          status: "pending",
          raw: {
            provider: "demo",
            message: "Payment provider is not configured; this order can be confirmed inside the app.",
            planCode: plan.code,
          },
        };
      },
      async getPayment(providerPaymentId: string): Promise<PaymentProviderStatus> {
        return {
          providerPaymentId,
          status: "succeeded",
          paid: true,
          amount: 0,
          currency: "RUB",
          paymentMethodTitle: "Демо-карта •••• 4242",
          raw: { provider: "demo", status: "succeeded" },
        };
      },
    };
  }

  return {
    name: provider,
    async createPayment(order: SubscriptionOrderRow, plan: SubscriptionPlan, returnUrl?: string): Promise<PaymentProviderCreateResult> {
      const response = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
          Authorization: yookassaAuthHeader(),
          "Content-Type": "application/json",
          "Idempotence-Key": order.idempotency_key,
        },
        body: JSON.stringify({
          amount: { value: (order.amount / 100).toFixed(2), currency: order.currency },
          confirmation: { type: "redirect", return_url: returnUrl || process.env.PAYMENT_RETURN_URL },
          capture: true,
          description: `Подписка ${plan.name}`,
          metadata: { orderId: order.id, masterId: order.master_id, planCode: plan.code },
          save_payment_method: autoRenewFeatureEnabled(),
        }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.description || data.message || "Payment create failed"));
      const confirmation = data.confirmation as { confirmation_url?: string } | undefined;
      return {
        providerPaymentId: String(data.id || ""),
        paymentUrl: confirmation?.confirmation_url || "",
        status: String(data.status || "pending") as PaymentProviderCreateResult["status"],
        raw: sanitizeProviderPayload(data),
      };
    },
    async getPayment(providerPaymentId: string): Promise<PaymentProviderStatus> {
      const response = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(providerPaymentId)}`, {
        headers: { Authorization: yookassaAuthHeader() },
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.description || data.message || "Payment status failed"));
      const amount = data.amount as { value?: string; currency?: string } | undefined;
      const cancellation = data.cancellation_details as { reason?: string; party?: string } | undefined;
      const method = data.payment_method as { title?: string; saved?: boolean; id?: string } | undefined;
      const receipt = Array.isArray(data.receipts) ? (data.receipts[0] as { receipt_url?: string } | undefined) : undefined;
      return {
        providerPaymentId,
        status: String(data.status || "pending") as PaymentProviderStatus["status"],
        paid: data.paid === true,
        amount: Math.round(Number(amount?.value || 0) * 100),
        currency: amount?.currency || "RUB",
        failureCode: cancellation?.reason,
        failureMessage: cancellation?.reason,
        paymentMethodTitle: method?.title,
        receiptUrl: receipt?.receipt_url,
        raw: sanitizeProviderPayload(data),
      };
    },
  };
}

function sanitizeProviderPayload(payload: Record<string, unknown>) {
  const copy = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  if (copy.payment_method && typeof copy.payment_method === "object") {
    const method = copy.payment_method as Record<string, unknown>;
    delete method.card;
    delete method.account_number;
  }
  delete copy.authorization_details;
  return copy;
}

export async function createCheckout(masterId: string, planId: string, returnUrl?: string) {
  await ensureSubscriptionSchema();
  const plan = await getPlan(planId);
  if (!plan) {
    const error = new Error("Тариф больше недоступен.");
    error.name = "PLAN_UNAVAILABLE";
    throw error;
  }
  if (plan.currency !== "RUB") throw new Error("Поддерживается только валюта RUB.");

  await getSubscriptionForMaster(masterId);
  const idempotencyKey = randomUUID();
  const order = await pool.query<SubscriptionOrderRow>(
    `
      INSERT INTO subscription_orders (master_id, plan_id, amount, currency, duration_months, status, idempotency_key, metadata)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
      RETURNING *
    `,
    [masterId, plan.id, plan.price, plan.currency, plan.duration_months, idempotencyKey, JSON.stringify({ planSnapshot: plan })],
  );

  const provider = getPaymentProvider();
  const created = await provider.createPayment(order.rows[0], plan, returnUrl);
  const updated = await pool.query<SubscriptionOrderRow>(
    `
      UPDATE subscription_orders
      SET provider_payment_id = $1, payment_url = $2, status = $3, metadata = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
    [
      created.providerPaymentId,
      created.paymentUrl,
      created.status === "succeeded" ? "processing" : "pending",
      JSON.stringify({ provider: provider.name, providerResponse: created.raw, planSnapshot: plan }),
      order.rows[0].id,
    ],
  );
  return { order: updated.rows[0], plan };
}

export async function listOrders(masterId: string, page = 1, pageSize = 20) {
  await ensureSubscriptionSchema();
  const limit = Math.min(Math.max(pageSize, 1), 50);
  const offset = (Math.max(page, 1) - 1) * limit;
  const result = await pool.query<SubscriptionOrderRow>(
    "SELECT * FROM subscription_orders WHERE master_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [masterId, limit, offset],
  );
  return result.rows;
}

export async function retryOrder(masterId: string, orderId: string) {
  await ensureSubscriptionSchema();
  const existing = await pool.query<SubscriptionOrderRow>(
    "SELECT * FROM subscription_orders WHERE id = $1 AND master_id = $2 LIMIT 1",
    [orderId, masterId],
  );
  const order = existing.rows[0];
  if (!order || !["failed", "cancelled", "pending"].includes(order.status)) return null;
  return createCheckout(masterId, order.plan_id);
}

export async function confirmDemoOrder(masterId: string, orderId: string) {
  await ensureSubscriptionSchema();
  const existing = await pool.query<SubscriptionOrderRow>(
    "SELECT * FROM subscription_orders WHERE id = $1 AND master_id = $2 LIMIT 1",
    [orderId, masterId],
  );
  const order = existing.rows[0];
  if (!order || order.status === "paid") return order || null;
  if (!String(order.provider_payment_id || "").startsWith("demo_")) throw new Error("Этот платеж подтверждается платежным провайдером.");
  return applyPaidOrder(order, {
    providerPaymentId: order.provider_payment_id || `demo_${order.id}`,
    status: "succeeded",
    paid: true,
    amount: order.amount,
    currency: order.currency,
    paymentMethodTitle: "Демо-карта •••• 4242",
    raw: { provider: "demo", status: "succeeded" },
  });
}

export async function applyPaidOrder(order: SubscriptionOrderRow, providerStatus: PaymentProviderStatus, paidAt = new Date()) {
  if (order.status === "paid") return order;
  if (providerStatus.currency !== order.currency || providerStatus.amount !== order.amount) {
    await markOrderFailed(order.id, "amount_mismatch", "Сумма или валюта платежа не совпадает с заказом.");
    throw new Error("Payment amount mismatch");
  }

  const subscription = await getSubscriptionForMaster(order.master_id);
  const now = paidAt;
  const currentEnd = subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at) : null;
  const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const base = [currentEnd, trialEnd]
    .filter((date): date is Date => date instanceof Date && date.getTime() > now.getTime())
    .sort((a, b) => b.getTime() - a.getTime())[0] || now;
  const periodStart = base.getTime() > now.getTime() ? base : now;
  const periodEnd = addCalendarMonthsUtc(periodStart, order.duration_months);

  const updatedOrder = await pool.query<SubscriptionOrderRow>(
    `
      UPDATE subscription_orders
      SET status = 'paid', paid_at = $1, failure_code = NULL, failure_message = NULL,
          payment_method_title = $2, receipt_url = $3, metadata = $4, updated_at = NOW()
      WHERE id = $5 AND status <> 'paid'
      RETURNING *
    `,
    [
      toIso(now),
      providerStatus.paymentMethodTitle || null,
      providerStatus.receiptUrl || null,
      JSON.stringify({ ...(order.metadata || {}), providerStatus: providerStatus.raw }),
      order.id,
    ],
  );
  if (!updatedOrder.rowCount) return order;

  await pool.query<SubscriptionRow>(
    `
      UPDATE subscriptions
      SET plan_id = $1, status = 'active', current_period_started_at = $2, current_period_ends_at = $3, updated_at = NOW()
      WHERE master_id = $4
      RETURNING *
    `,
    [order.plan_id, toIso(periodStart), toIso(periodEnd), order.master_id],
  );
  return updatedOrder.rows[0];
}

export async function markOrderFailed(orderId: string, code: string, message: string, status: SubscriptionOrderStatus = "failed") {
  const result = await pool.query<SubscriptionOrderRow>(
    `
      UPDATE subscription_orders
      SET status = $1, failed_at = NOW(), failure_code = $2, failure_message = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [status, code, message, orderId],
  );
  if (result.rows[0]) {
    await pool.query("UPDATE subscriptions SET status = 'payment_failed', updated_at = NOW() WHERE master_id = $1 AND status <> 'active'", [
      result.rows[0].master_id,
    ]);
  }
  return result.rows[0] || null;
}

export async function handleProviderPayment(providerPaymentId: string) {
  await ensureSubscriptionSchema();
  const orderResult = await pool.query<SubscriptionOrderRow>(
    "SELECT * FROM subscription_orders WHERE provider_payment_id = $1 LIMIT 1",
    [providerPaymentId],
  );
  const order = orderResult.rows[0];
  if (!order) throw new Error("Order not found");

  const provider = getPaymentProvider();
  const status = await provider.getPayment(providerPaymentId);
  if (status.status === "succeeded" && status.paid) return applyPaidOrder(order, status);
  if (status.status === "canceled") return markOrderFailed(order.id, status.failureCode || "cancelled", status.failureMessage || "Платеж отменен.", "cancelled");
  await pool.query("UPDATE subscription_orders SET status = 'processing', metadata = $1, updated_at = NOW() WHERE id = $2", [
    JSON.stringify({ ...(order.metadata || {}), providerStatus: status.raw }),
    order.id,
  ]);
  await pool.query("UPDATE subscriptions SET status = 'payment_processing', updated_at = NOW() WHERE master_id = $1", [order.master_id]);
  return order;
}

export function verifyWebhookSecret(request: Request, body: string) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return true;
  const headerSecret = request.headers.get("x-webhook-secret");
  if (headerSecret) {
    const left = Buffer.from(headerSecret);
    const right = Buffer.from(secret);
    return left.length === right.length && timingSafeEqual(left, right);
  }
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) return false;
  const expected = createHash("sha256").update(`${body}:${secret}`).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function recordPaymentEvent(provider: string, externalEventId: string, eventType: string, payload: unknown) {
  await ensureSubscriptionSchema();
  const result = await pool.query<{ id: string; processing_status: PaymentEventProcessingStatus }>(
    `
      INSERT INTO payment_events (provider, external_event_id, event_type, payload, processing_status)
      VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING id, processing_status
    `,
    [provider, externalEventId, eventType, JSON.stringify(sanitizeProviderPayload((payload || {}) as Record<string, unknown>))],
  );
  return result.rows[0] || null;
}

export async function finishPaymentEvent(externalEventId: string, status: PaymentEventProcessingStatus, errorMessage = "") {
  await pool.query(
    "UPDATE payment_events SET processing_status = $1, processed_at = NOW(), error_message = $2 WHERE external_event_id = $3",
    [status, errorMessage, externalEventId],
  );
}

export async function setAutoRenew(masterId: string, enabled: boolean, planId?: string) {
  await ensureSubscriptionSchema();
  const subscription = await getSubscriptionForMaster(masterId);
  if (enabled && !autoRenewFeatureEnabled()) throw new Error("Автопродление временно отключено.");
  const targetPlanId = enabled ? planId || subscription.plan_id : null;
  const updated = await pool.query<SubscriptionRow>(
    `
      UPDATE subscriptions
      SET auto_renew = $1, auto_renew_plan_id = $2, cancel_at_period_end = $3, updated_at = NOW()
      WHERE master_id = $4
      RETURNING *
    `,
    [enabled, targetPlanId, !enabled, masterId],
  );
  return updated.rows[0];
}

export async function hasActiveSubscription(masterId: string) {
  if (!subscriptionFeatureEnabled()) return true;
  const subscription = await getSubscriptionForMaster(masterId);
  return isPaidStatus(deriveSubscriptionStatus(subscription));
}

export async function assertSubscriptionAccess(masterId: string) {
  if (await hasActiveSubscription(masterId)) return;
  const error = new Error("Для этого действия нужна активная подписка.");
  error.name = "SUBSCRIPTION_REQUIRED";
  throw error;
}

export async function getCurrentSubscriptionSession() {
  const session = await getCurrentUserAndMaster();
  if (!session) return null;
  const subscription = await getSubscriptionForMaster(session.master.id);
  const plans = await listPlans(false);
  const plan = plans.find((item) => item.id === subscription.plan_id) || null;
  return { ...session, subscription, plan };
}

export async function getAdminSubscription(masterId: string) {
  const subscription = await getSubscriptionForMaster(masterId);
  const plans = await listPlans(false);
  const plan = plans.find((item) => item.id === subscription.plan_id) || null;
  const payments = await listOrders(masterId, 1, 30);
  return {
    subscription,
    subscriptionInfo: mapSubscription(subscription, plan),
    plans,
    payments,
  };
}

export async function updateSubscriptionByAdmin(
  masterId: string,
  input: {
    status: SubscriptionStatus;
    planId: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    autoRenew: boolean;
    autoRenewPlanId: string | null;
    cancelAtPeriodEnd: boolean;
  },
) {
  await ensureSubscriptionSchema();
  if (!subscriptionStatuses.includes(input.status)) throw new Error("Некорректный статус подписки.");
  if (input.planId && !(await pool.query<SubscriptionPlan>("SELECT * FROM subscription_plans WHERE id = $1 LIMIT 1", [input.planId])).rowCount) {
    throw new Error("Тариф не найден.");
  }

  await getSubscriptionForMaster(masterId);
  const result = await pool.query<SubscriptionRow>(
    `
      UPDATE subscriptions
      SET status = $1,
          plan_id = $2,
          trial_ends_at = $3,
          current_period_ends_at = $4,
          auto_renew = $5,
          auto_renew_plan_id = $6,
          cancel_at_period_end = $7,
          updated_at = NOW()
      WHERE master_id = $8
      RETURNING *
    `,
    [
      input.status,
      input.planId,
      input.trialEndsAt,
      input.currentPeriodEndsAt,
      input.autoRenew,
      input.autoRenew ? input.autoRenewPlanId || input.planId : null,
      input.cancelAtPeriodEnd,
      masterId,
    ],
  );
  return result.rows[0];
}

export async function updatePlanByAdmin(
  planId: string,
  input: { name: string; durationMonths: number; price: number; discountPercent: number; isActive: boolean; sortOrder: number },
) {
  await ensureSubscriptionSchema();
  const result = await pool.query<SubscriptionPlan>(
    `
      UPDATE subscription_plans
      SET name = $1,
          duration_months = $2,
          price = $3,
          discount_percent = $4,
          is_active = $5,
          sort_order = $6,
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `,
    [
      input.name.trim(),
      Math.max(1, Math.round(input.durationMonths)),
      Math.max(0, Math.round(input.price)),
      Math.max(0, Math.round(input.discountPercent)),
      input.isActive,
      Math.round(input.sortOrder),
      planId,
    ],
  );
  if (!result.rows[0]) throw new Error("Тариф не найден.");
  return result.rows[0];
}

export async function recordDueSubscriptionNotifications(now = new Date()) {
  await ensureSubscriptionSchema();
  const result = await pool.query<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE current_period_ends_at IS NOT NULL AND status IN ('trial', 'active', 'ending_soon')",
  );
  const offsets = [
    { days: 7, type: "expires_in_7_days" },
    { days: 3, type: "expires_in_3_days" },
    { days: 1, type: "expires_in_1_day" },
    { days: 0, type: "expires_today" },
  ];
  let created = 0;
  for (const subscription of result.rows) {
    const end = subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at) : null;
    if (!end) continue;
    const left = Math.ceil((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
    const match = offsets.find((item) => item.days === left);
    if (!match) continue;
    const uniqueKey = `${subscription.id}:${match.type}:${end.toISOString().slice(0, 10)}`;
    const inserted = await pool.query<{ id: string }>(
      `
        INSERT INTO subscription_notifications (subscription_id, notification_type, scheduled_for, sent_at, status, unique_key)
        VALUES ($1, $2, $3, NOW(), 'sent', $4)
        ON CONFLICT (unique_key) DO NOTHING
        RETURNING id
      `,
      [subscription.id, match.type, toIso(now), uniqueKey],
    );
    created += inserted.rowCount || 0;
  }
  return created;
}
