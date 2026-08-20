import { NextResponse } from "next/server";
import {
  finishPaymentEvent,
  handleProviderPayment,
  recordPaymentEvent,
  verifyWebhookSecret,
} from "../../../../lib/subscription";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (!verifyWebhookSecret(request, rawBody)) {
      return NextResponse.json({ success: false, error: "Webhook signature is invalid." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      object?: { id?: string; status?: string; metadata?: { orderId?: string } };
      id?: string;
    };
    const providerPaymentId = payload.object?.id;
    const eventType = payload.event || payload.object?.status || "payment.unknown";
    const externalEventId = payload.id || `${eventType}:${providerPaymentId || "unknown"}`;
    const event = await recordPaymentEvent("yookassa", externalEventId, eventType, payload);
    if (!event) return NextResponse.json({ success: true, duplicate: true });

    if (!providerPaymentId) {
      await finishPaymentEvent(externalEventId, "ignored", "No payment id in webhook.");
      return NextResponse.json({ success: true, ignored: true });
    }

    await handleProviderPayment(providerPaymentId);
    await finishPaymentEvent(externalEventId, "processed");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment webhook error:", error);
    try {
      const parsed = JSON.parse(rawBody) as { event?: string; object?: { id?: string }; id?: string };
      await finishPaymentEvent(parsed.id || `${parsed.event || "payment.unknown"}:${parsed.object?.id || "unknown"}`, "failed", error instanceof Error ? error.message : "Webhook failed");
    } catch {}
    return NextResponse.json({ success: false, error: "Webhook processing failed." }, { status: 500 });
  }
}
