import type { Customer, CustomerRiskLevel, Order } from "@/types";
import { normalizePhoneInput } from "@/lib/auth/phone";

export type PreferredChannel = "phone" | "zalo" | "sms" | "email";

export type CustomerRow = Customer & {
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt?: Date | string;
  trafficRisk: CustomerRiskLevel;
};

export type CustomerFilters = {
  query: string;
  risk: "all" | CustomerRiskLevel;
  verification: "all" | "verified" | "unverified";
};

export type CustomerStats = {
  total: number;
  verified: number;
  red: number;
  points: number;
  revenue: number;
};

export type NewCustomerForm = {
  name: string;
  phone: string;
  email: string;
  tagsText: string;
  internalNotes: string;
  preferredChannel: PreferredChannel;
};

export const highValueThreshold = 300000;

export const initialNewCustomerForm: NewCustomerForm = {
  name: "",
  phone: "",
  email: "",
  tagsText: "",
  internalNotes: "",
  preferredChannel: "phone",
};

export const riskLabels: Record<CustomerRiskLevel, string> = {
  green: "Luồng xanh",
  yellow: "Luồng vàng",
  red: "Luồng đỏ",
};

export const riskClasses: Record<CustomerRiskLevel, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  yellow: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
};

export const channelLabels: Record<PreferredChannel, string> = {
  phone: "Gọi điện",
  zalo: "Zalo",
  sms: "SMS",
  email: "Email",
};

const completedStatuses = new Set(["completed", "delivered"]);
const openOrderStatuses = new Set([
  "pending",
  "confirmed",
  "processing",
  "preparing",
  "ready",
]);

export function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getTimestamp(value?: Date | string) {
  if (!value) return 0;
  const time =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value?: Date | string) {
  const time = getTimestamp(value);
  if (!time) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(time));
}

export function getCustomerOrders(customer: Customer, orders: Order[]) {
  const phone = normalizePhoneInput(customer.phone);
  const email = customer.email?.trim().toLowerCase();

  return orders.filter((order) => {
    if (order.customerId && order.customerId === customer.id) return true;
    if (
      order.customerPhone &&
      normalizePhoneInput(order.customerPhone) === phone
    )
      return true;
    return Boolean(
      email && order.customerEmail?.trim().toLowerCase() === email,
    );
  });
}

export function inferRisk(
  customer: Customer,
  customerOrders: Order[],
): CustomerRiskLevel {
  if (customer.riskLevel) return customer.riskLevel;
  if (customer.phoneVerifiedAt) return "green";

  const hasHighValueOpenOrder = customerOrders.some(
    (order) =>
      openOrderStatuses.has(order.status) &&
      (order.totalAmount ?? 0) >= highValueThreshold,
  );

  return hasHighValueOpenOrder ? "red" : "yellow";
}

export function buildCustomerRows(customers: Customer[], orders: Order[]) {
  return customers.map<CustomerRow>((customer) => {
    const customerOrders = getCustomerOrders(customer, orders);
    const completedOrders = customerOrders.filter((order) =>
      completedStatuses.has(order.status),
    );
    const latestOrder = [...customerOrders].sort(
      (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
    )[0];

    return {
      ...customer,
      orderCount: customerOrders.length,
      lifetimeValue: completedOrders.reduce(
        (sum, order) => sum + (order.totalAmount ?? 0),
        0,
      ),
      lastOrderAt: latestOrder?.createdAt ?? customer.lastOrderAt,
      trafficRisk: inferRisk(customer, customerOrders),
    };
  });
}

export function filterCustomerRows(
  rows: CustomerRow[],
  filters: CustomerFilters,
) {
  const keyword = filters.query.trim().toLowerCase();

  return rows.filter((customer) => {
    const matchesKeyword =
      !keyword ||
      [customer.name, customer.phone, customer.email, ...(customer.tags ?? [])]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword));
    const matchesRisk =
      filters.risk === "all" || customer.trafficRisk === filters.risk;
    const matchesVerification =
      filters.verification === "all" ||
      (filters.verification === "verified"
        ? Boolean(customer.phoneVerifiedAt)
        : !customer.phoneVerifiedAt);

    return matchesKeyword && matchesRisk && matchesVerification;
  });
}

export function getCustomerStats(rows: CustomerRow[]): CustomerStats {
  return {
    total: rows.length,
    verified: rows.filter((customer) => customer.phoneVerifiedAt).length,
    red: rows.filter((customer) => customer.trafficRisk === "red").length,
    points: rows.reduce((sum, customer) => sum + customer.loyaltyPoints, 0),
    revenue: rows.reduce((sum, customer) => sum + customer.lifetimeValue, 0),
  };
}
