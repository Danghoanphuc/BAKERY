import type { Order, OrderStatus } from "@/types";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "processing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "completed", "cancelled"],
  processing: ["completed", "delivered", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function getPrimaryOrderTransition(
  order: Pick<Order, "orderType" | "status">,
): OrderStatus | null {
  switch (order.status) {
    case "pending":
      return "confirmed";
    case "confirmed":
      return order.orderType === "preorder" ? "processing" : "preparing";
    case "preparing":
      return "ready";
    case "ready":
    case "processing":
      return order.orderType === "delivery" ? "delivered" : "completed";
    default:
      return null;
  }
}
