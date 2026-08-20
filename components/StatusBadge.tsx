"use client";

import { CheckCircle, ClockCounterClockwise, Info, WarningCircle, XCircle } from "@phosphor-icons/react";

export type StatusIntent = "success" | "warning" | "info" | "danger";

export type StatusMeta = {
  color: StatusIntent;
  icon: typeof CheckCircle;
  label: string;
  text: string;
};

const statusToneClasses: Record<StatusIntent, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  info: "border-info/25 bg-info/10 text-info",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

export const subscriptionStatusLabels: Record<string, string> = {
  trial: "Бесплатный период",
  active: "Активна",
  ending_soon: "Скоро закончится",
  pending_payment: "Ожидает оплаты",
  payment_processing: "Платеж обрабатывается",
  payment_failed: "Платеж не прошел",
  expired: "Истекла",
  cancelled: "Отменена",
  canceled: "Отменена",
  blocked: "Заблокирована",
  refunded: "Возврат средств",
  no_show: "Не пришёл",
};

const normalizeStatus = (value?: string) => (value || "").trim().toLowerCase();

function getStatusMeta(status?: string, fallbackLabel = status || "Статус"): StatusMeta {
  const normalized = normalizeStatus(status);
  const label = subscriptionStatusLabels[normalized] || fallbackLabel || "Статус";

  if (["active", "confirmed", "done", "paid", "processed", "succeeded"].includes(normalized) || normalized.includes("актив") || normalized.includes("подтверж") || normalized.includes("заверш")) {
    return { color: "success", icon: CheckCircle, label, text: label };
  }

  if (["trial", "ending_soon", "pending", "pending_payment", "payment_processing", "processing"].includes(normalized) || normalized.includes("ожида") || normalized.includes("обрабаты")) {
    return { color: "warning", icon: WarningCircle, label, text: label };
  }

  if (["cancelled", "canceled", "failed", "payment_failed", "expired", "blocked", "refunded", "no_show"].includes(normalized) || normalized.includes("отмен") || normalized.includes("истек") || normalized.includes("ошиб") || normalized.includes("не приш")) {
    return { color: "danger", icon: XCircle, label, text: label };
  }

  if (["hidden", "draft", "scheduled"].includes(normalized) || normalized.includes("скрыт")) {
    return { color: "info", icon: Info, label, text: label };
  }

  return { color: "info", icon: ClockCounterClockwise, label, text: label };
}

export function StatusBadge({ className = "", label, status }: { className?: string; label?: string; status: string }) {
  const meta = getStatusMeta(status, label);
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-badge ${statusToneClasses[meta.color]} ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
      <span className="truncate">{meta.text}</span>
    </span>
  );
}
