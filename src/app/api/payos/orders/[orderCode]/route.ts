import { NextResponse } from "next/server";
import { getOrderByPayOSOrderCode } from "@/lib/db";
import { getPayOSClient } from "@/lib/payos";
import { syncOrderPaidFromPayOS } from "@/lib/payos-order-sync";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderCode: string }> },
) {
  try {
    const { orderCode } = await context.params;
    const numericOrderCode = Number(orderCode);

    if (!Number.isFinite(numericOrderCode)) {
      return NextResponse.json({ error: "Invalid order code" }, { status: 400 });
    }

    const [paymentLink, order] = await Promise.all([
      getPayOSClient().paymentRequests.get(numericOrderCode),
      getOrderByPayOSOrderCode(numericOrderCode),
    ]);

    if (order && paymentLink.status === "PAID" && order.paymentStatus !== "paid") {
      await syncOrderPaidFromPayOS(order, paymentLink);
    }

    return NextResponse.json({
      orderCode: numericOrderCode,
      status: paymentLink.status,
      amount: paymentLink.amount,
      amountPaid: paymentLink.amountPaid,
      amountRemaining: paymentLink.amountRemaining,
      isPaid: paymentLink.status === "PAID",
    });
  } catch (error) {
    console.error("Failed to fetch PayOS payment status:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 },
    );
  }
}
