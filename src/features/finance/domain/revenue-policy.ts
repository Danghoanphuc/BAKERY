import type { Order, OrderStatus } from "@/types";

const RECOGNIZED_ORDER_STATUSES = new Set<OrderStatus>([
  "confirmed",
  "preparing",
  "ready",
  "processing",
  "completed",
  "delivered",
]);

export function isRevenueRecognized(order: Pick<Order, "status">) {
  return RECOGNIZED_ORDER_STATUSES.has(order.status);
}

export function isOrderCancelled(order: Pick<Order, "status">) {
  return order.status === "cancelled";
}

export function isPaymentCollected(order: Pick<Order, "paymentStatus">) {
  return order.paymentStatus === "paid";
}

