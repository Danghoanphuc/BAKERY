import type { OrderStatus, OrderType, PaymentStatus } from "@/types";

export type TabFilter = "all" | OrderType;
export type DateFilter = "all" | "today" | "upcoming" | "overdue";
export type StatusFilter = "all" | OrderStatus;

export const tabs: { id: TabFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "delivery", label: "Giao hàng" },
  { id: "pickup", label: "Đến lấy" },
  { id: "preorder", label: "Đặt trước" },
];

export const statuses: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "ready", label: "Sẵn sàng" },
  { value: "processing", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
];

export const orderTypeLabel: Record<OrderType, string> = {
  delivery: "Giao hàng",
  pickup: "Đến lấy",
  preorder: "Đặt trước",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

export const statusFlow: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "processing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "completed", "cancelled"],
  processing: ["completed", "delivered", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};

export const activeStatuses = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "processing",
]);

export const terminalStatuses = new Set<OrderStatus>([
  "completed",
  "delivered",
  "cancelled",
]);

export function labelForStatus(status: OrderStatus): string {
  return statuses.find((s) => s.value === status)?.label ?? status;
}
