import {
  updateOrder,
} from "@/lib/db";
import { getPayOSClient, isPayOSEnabled } from "@/lib/payos";
import type { Order } from "@/types";
import { fulfillPaidPosOrder } from "@/lib/pos-order-fulfillment";

type PayOSPaymentLink = Awaited<
  ReturnType<ReturnType<typeof getPayOSClient>["paymentRequests"]["get"]>
>;

export async function fetchPayOSPaymentLink(orderCode: number) {
  const payos = getPayOSClient();
  return payos.paymentRequests.get(orderCode);
}
export function isPayOSPaymentLinkPaid(link: PayOSPaymentLink) {
  return link.status === "PAID";
}

export async function syncOrderPaidFromPayOS(
  order: Order,
  payosLink: PayOSPaymentLink,
) {
  if (order.paymentStatus === "paid") {
    if (order.salesChannel === "pos" && !order.posFulfilledAt) {
      const fulfillment = await fulfillPaidPosOrder(order, "payos");
      return {
        ...order,
        payosStockDeducted: true,
        actualCostOfGoods: fulfillment.actualCostOfGoods,
        posFulfilledAt: fulfillment.fulfilledAt,
      };
    }
    return order;
  }

  if (!isPayOSPaymentLinkPaid(payosLink)) {
    return order;
  }

  const transaction =
    payosLink.transactions[payosLink.transactions.length - 1];
  const nextStatus = order.salesChannel === "pos" ? "completed" : order.status;

  const paidAt = new Date();
  const paidOrder: Order = {
    ...order,
    paymentStatus: "paid",
    paidAt,
    payosPaymentLinkId: payosLink.id,
    payosReference: transaction?.reference,
    payosTransactionDateTime: transaction?.transactionDateTime,
    status: nextStatus,
    statusHistory: [
      ...(order.statusHistory ?? []),
      {
        status: nextStatus,
        at: new Date().toISOString(),
        actor: "payos",
        note: transaction?.reference
          ? `PayOS ${transaction.reference}`
          : "PayOS thanh toán thành công",
      },
    ],
  };
  await updateOrder(order.id, {
    paymentStatus: paidOrder.paymentStatus,
    paidAt: paidOrder.paidAt,
    payosPaymentLinkId: paidOrder.payosPaymentLinkId,
    payosReference: paidOrder.payosReference,
    payosTransactionDateTime: paidOrder.payosTransactionDateTime,
    status: paidOrder.status,
    statusHistory: paidOrder.statusHistory,
  });
  const fulfillment = await fulfillPaidPosOrder(paidOrder, "payos");

  return {
    ...paidOrder,
    payosStockDeducted: true,
    actualCostOfGoods: fulfillment.actualCostOfGoods,
    posFulfilledAt: fulfillment.fulfilledAt,
  };
}

export async function syncPendingOrderFromPayOS(order: Order) {
  if (order.paymentStatus === "paid" || !order.payosOrderCode) {
    return order;
  }

  if (!isPayOSEnabled()) {
    return order;
  }

  try {
    const payosLink = await fetchPayOSPaymentLink(order.payosOrderCode);
    return await syncOrderPaidFromPayOS(order, payosLink);
  } catch (error) {
    console.error("PayOS payment sync failed:", error);
    return order;
  }
}
