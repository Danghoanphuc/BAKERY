import type { Order } from "@/types";
import { DateFilter } from "./constants";

type DateLike =
  | Date
  | string
  | number
  | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  | undefined
  | null;

function toDateSafe(value: DateLike): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const parsed = value.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value.seconds === "number") {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDateTime(date?: DateLike): string {
  const d = toDateSafe(date);
  if (!d) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function isToday(date?: DateLike): boolean {
  const d = toDateSafe(date);
  if (!d) return false;

  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isOverdueOrder(order: Order): boolean {
  const pickupDate = toDateSafe(order.pickupTime);
  if (!pickupDate) return false;

  return (
    pickupDate.getTime() < Date.now() &&
    order.status !== "completed" &&
    order.status !== "delivered" &&
    order.status !== "cancelled"
  );
}

export function matchesDateFilter(order: Order, filter: DateFilter): boolean {
  if (filter === "all") return true;
  if (filter === "today") return isToday(order.createdAt);
  if (filter === "overdue") return isOverdueOrder(order);
  if (filter === "upcoming") {
    const pickupDate = toDateSafe(order.pickupTime);
    return pickupDate ? pickupDate.getTime() > Date.now() : false;
  }

  return true;
}

export function getQuickActions(
  order: Order,
): Array<{ status: Order["status"]; label: string }> {
  const flow = {
    pending: [{ status: "confirmed" as const, label: "Xác nhận" }],
    confirmed: [{ status: "preparing" as const, label: "Bếp chuẩn bị" }],
    preparing: [{ status: "ready" as const, label: "Sẵn sàng" }],
    ready: [{ status: "completed" as const, label: "Hoàn thành" }],
    processing: [{ status: "completed" as const, label: "Hoàn thành" }],
    completed: [],
    delivered: [],
    cancelled: [],
  };

  return flow[order.status] || [];
}
