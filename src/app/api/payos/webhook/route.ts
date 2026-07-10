import { NextResponse } from "next/server";
import { getOrderByPayOSOrderCode } from "@/lib/db";
import { getPayOSClient } from "@/lib/payos";
import {
  fetchPayOSPaymentLink,
  syncOrderPaidFromPayOS,
} from "@/lib/payos-order-sync";

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

    const payosLink = await fetchPayOSPaymentLink(webhookData.orderCode);
    await syncOrderPaidFromPayOS(order, payosLink);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayOS webhook failed:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
