import {
  getAllProducts,
  updateOrder,
  updateProduct,
} from "@/lib/db";
import { getPayOSClient, isPayOSEnabled } from "@/lib/payos";
import type { CartItem, Order } from "@/types";

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

  if (!order.payosStockDeducted) {
    await decrementStock(order.items);
  }

  await updateOrder(order.id, {
    paymentStatus: "paid",
    paidAt: new Date(),
    payosPaymentLinkId: payosLink.id,
    payosReference: transaction?.reference,
    payosTransactionDateTime: transaction?.transactionDateTime,
    payosStockDeducted: true,
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

  return {
    ...order,
    paymentStatus: "paid" as const,
    status: nextStatus,
    paidAt: new Date(),
    payosStockDeducted: true,
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

async function decrementStock(items: Order["items"]) {
  const products = await getAllProducts();
  const quantityByProductId = new Map<string, number>();

  for (const item of items as CartItem[]) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

  await Promise.all(
    [...quantityByProductId.entries()].map(async ([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      if (typeof product?.stock !== "number") return;

      await updateProduct(productId, {
        stock: Math.max(0, product.stock - quantity),
      });
    }),
  );
}
