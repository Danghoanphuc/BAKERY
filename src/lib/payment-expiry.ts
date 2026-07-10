import { updateOrder } from "@/lib/db";
import { syncPendingOrderFromPayOS } from "@/lib/payos-order-sync";
import type { Order } from "@/types";

export const BANK_TRANSFER_PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

export function getBankTransferPaymentExpiresAt(order: Pick<Order, "createdAt">) {
  const createdAtMs = getTimeMs(order.createdAt);
  return createdAtMs ? new Date(createdAtMs + BANK_TRANSFER_PAYMENT_TIMEOUT_MS) : null;
}

export function getPaymentSecondsRemaining(order: Pick<Order, "createdAt">) {
  const expiresAt = getBankTransferPaymentExpiresAt(order);
  if (!expiresAt) return null;

  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}

export async function expireUnpaidBankTransferOrder(order: Order) {
  if (
    order.paymentMethod !== "bank_transfer" ||
    order.paymentStatus === "paid" ||
    order.status === "cancelled"
  ) {
    return order;
  }

  const expiresAt = getBankTransferPaymentExpiresAt(order);
  if (!expiresAt || Date.now() < expiresAt.getTime()) {
    return order;
  }

  const syncedOrder = await syncPendingOrderFromPayOS(order);
  if (syncedOrder.paymentStatus === "paid" || syncedOrder.status === "cancelled") {
    return syncedOrder;
  }

  const now = new Date();
  await updateOrder(syncedOrder.id, {
    status: "cancelled",
    paymentStatus: "unpaid",
    cancelReason: "Quá hạn thanh toán chuyển khoản",
    statusHistory: [
      ...(syncedOrder.statusHistory ?? []),
      {
        status: "cancelled",
        at: now.toISOString(),
        actor: "system",
        note: "Quá hạn thanh toán chuyển khoản",
      },
    ],
  });

  return {
    ...syncedOrder,
    status: "cancelled" as const,
    paymentStatus: "unpaid" as const,
    cancelReason: "Quá hạn thanh toán chuyển khoản",
    updatedAt: now,
  };
}

function getTimeMs(value: unknown) {
  if (value instanceof Date) return value.getTime();

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  return null;
}
