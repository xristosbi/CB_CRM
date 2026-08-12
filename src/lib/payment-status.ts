import type { PaymentStatus } from "@/lib/database.types";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Εκκρεμεί",
  paid: "Πληρώθηκε",
  cancelled: "Ακυρώθηκε",
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<
  PaymentStatus,
  "warning" | "success" | "secondary"
> = {
  pending: "warning",
  paid: "success",
  cancelled: "secondary",
};

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["pending", "paid", "cancelled"];

export const paymentCurrency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});
