import {
  updateOrder,
} from "@/lib/db";
import { getPayOSClient, isPayOSEnabled } from "@/lib/payos";
import type { Order } from "@/types";
import { captureOrderFinancials, recordProductSaleInventory } from "@/features/finance";

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
    return order;
  }

  if (!isPayOSPaymentLinkPaid(payosLink)) {
    return order;
  }

  const transaction =
    payosLink.transactions[payosLink.transactions.length - 1];
  const nextStatus = order.salesChannel === "pos" ? "completed" : order.status;

  let actualCostOfGoods = order.actualCostOfGoods;
  if (!order.payosStockDeducted) {
    const inventorySale = await recordProductSaleInventory({
      orderId: order.id,
      items: order.items.map((item) => ({
        ...item,
        unitStandardCost: order.itemFinancialSnapshots?.find(
          (snapshot) => snapshot.productId === item.productId,
        )?.unitCost,
      })),
      actor: "payos",
    });
    actualCostOfGoods = inventorySale.inventoryValue;
  }

  const paidAt = new Date();
  await updateOrder(order.id, {
    paymentStatus: "paid",
    paidAt,
    payosPaymentLinkId: payosLink.id,
    payosReference: transaction?.reference,
    payosTransactionDateTime: transaction?.transactionDateTime,
    payosStockDeducted: true,
    actualCostOfGoods,
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
  });

  await captureOrderFinancials(
    {
      ...order,
      paymentStatus: "paid",
      status: nextStatus,
      paidAt,
      payosReference: transaction?.reference,
      actualCostOfGoods,
    },
    "payos",
  );

  return {
    ...order,
    paymentStatus: "paid" as const,
    status: nextStatus,
    paidAt,
    payosStockDeducted: true,
    actualCostOfGoods,
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
