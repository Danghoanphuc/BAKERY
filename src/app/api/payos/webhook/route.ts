import { NextResponse } from "next/server";
import {
  getAllProducts,
  getOrderByPayOSOrderCode,
  updateOrder,
  updateProduct,
} from "@/lib/db";
import { getPayOSClient } from "@/lib/payos";
import type { CartItem, Order } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const webhookData = await getPayOSClient().webhooks.verify(body);

    if (webhookData.code !== "00") {
      return NextResponse.json({ success: true });
    }

    const order = await getOrderByPayOSOrderCode(webhookData.orderCode);
    if (!order) {
      console.error("PayOS webhook order not found:", webhookData.orderCode);
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ success: true });
    }

    await updateOrder(order.id, {
      paymentStatus: "paid",
      paidAt: new Date(),
      payosPaymentLinkId: webhookData.paymentLinkId,
      payosReference: webhookData.reference,
      payosTransactionDateTime: webhookData.transactionDateTime,
      status: order.salesChannel === "pos" ? "completed" : order.status,
      statusHistory: [
        ...(order.statusHistory ?? []),
        {
          status: order.salesChannel === "pos" ? "completed" : order.status,
          at: new Date().toISOString(),
          actor: "payos",
          note: `PayOS ${webhookData.reference}`,
        },
      ],
    });

    await decrementStock(order.items);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayOS webhook failed:", error);
    return NextResponse.json({ success: false }, { status: 400 });
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
