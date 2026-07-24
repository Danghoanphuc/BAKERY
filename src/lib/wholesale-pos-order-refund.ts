import { captureRefund } from "@/features/wholesale-finance";
import { updateOrder } from "@/lib/wholesale-db";
import {
  reverseCustomerLoyaltyPointsOnce,
  reverseVoucherRedemption,
} from "@/lib/wholesale-firebase";
import { returnConsumedPosInventory } from "@/lib/wholesale-firebase/pos-inventory";
import type { Order } from "@/types";

export async function refundPaidPosOrder(
  order: Order,
  input: { reason: string; actor: string },
) {
  if (order.salesChannel !== "pos") throw new Error("NOT_POS_ORDER");
  if (order.paymentStatus === "refunded") return order;
  if (order.paymentStatus !== "paid") throw new Error("ORDER_NOT_PAID");
  if (!input.reason.trim()) throw new Error("REFUND_REASON_REQUIRED");

  const refundedAt = new Date();
  await captureRefund({
    orderId: order.id,
    amount: order.totalAmount,
    method: order.paymentMethod ?? "other",
    occurredAt: refundedAt,
    reason: input.reason.trim(),
    actor: input.actor,
    idempotencyKey: `order:${order.id}:full-refund`,
  });
  await returnConsumedPosInventory(order.id);

  if (order.customerId && (order.loyaltyPointsEarned ?? 0) > 0) {
    await reverseCustomerLoyaltyPointsOnce({
      customerId: order.customerId,
      orderId: order.id,
      points: order.loyaltyPointsEarned ?? 0,
    });
  }
  if (order.voucherId && (order.discountAmount ?? 0) > 0) {
    await reverseVoucherRedemption({
      voucherId: order.voucherId,
      orderId: order.id,
      actor: input.actor,
    });
  }

  const nextOrder: Order = {
    ...order,
    status: "cancelled",
    paymentStatus: "refunded",
    refundedAt,
    refundReason: input.reason.trim(),
    inventoryReservationStatus: "released",
    statusHistory: [
      ...(order.statusHistory ?? []),
      {
        status: "cancelled",
        at: refundedAt.toISOString(),
        actor: input.actor,
        note: `Hoàn tiền: ${input.reason.trim()}`,
      },
    ],
  };
  await updateOrder(order.id, {
    status: nextOrder.status,
    paymentStatus: nextOrder.paymentStatus,
    refundedAt,
    refundReason: nextOrder.refundReason,
    inventoryReservationStatus: "released",
    statusHistory: nextOrder.statusHistory,
  });
  return nextOrder;
}
