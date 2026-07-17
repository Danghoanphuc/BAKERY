import type { Order, OrderStatus, PaymentStatus } from "@/types";

const ORDER_STATUSES = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "processing",
  "completed",
  "delivered",
  "cancelled",
]);
const PAYMENT_STATUSES = new Set<PaymentStatus>([
  "unpaid",
  "pending",
  "paid",
  "refunded",
]);
const ALLOWED_FIELDS = new Set([
  "status",
  "internalNotes",
  "assignedTo",
  "paymentStatus",
  "cancelReason",
]);

export function parseOrderUpdate(input: unknown): Partial<Order> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("INVALID_ORDER_UPDATE");
  }

  const source = input as Record<string, unknown>;
  if (Object.keys(source).some((key) => !ALLOWED_FIELDS.has(key))) {
    throw new Error("UNSUPPORTED_ORDER_UPDATE_FIELD");
  }

  const update: Partial<Order> = {};
  if (source.status !== undefined) {
    if (typeof source.status !== "string" || !ORDER_STATUSES.has(source.status as OrderStatus)) {
      throw new Error("INVALID_ORDER_STATUS");
    }
    update.status = source.status as OrderStatus;
  }
  if (source.paymentStatus !== undefined) {
    if (
      typeof source.paymentStatus !== "string" ||
      !PAYMENT_STATUSES.has(source.paymentStatus as PaymentStatus)
    ) {
      throw new Error("INVALID_PAYMENT_STATUS");
    }
    update.paymentStatus = source.paymentStatus as PaymentStatus;
  }

  for (const field of ["internalNotes", "assignedTo", "cancelReason"] as const) {
    const value = source[field];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > 2_000) {
        throw new Error("INVALID_ORDER_TEXT_FIELD");
      }
      update[field] = value.trim();
    }
  }

  return update;
}
