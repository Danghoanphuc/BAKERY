import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrderById } from "@/lib/wholesale-db";
import { refundPaidPosOrder } from "@/lib/wholesale-pos-order-refund";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: Params) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { orderId } = await params;
    const body = (await request.json()) as {
      reason?: string;
      settlementConfirmed?: boolean;
    };
    const order = await getOrderById(orderId);
    if (!order || order.salesChannel !== "pos") {
      return NextResponse.json({ error: "Không tìm thấy đơn POS." }, { status: 404 });
    }
    if (order.paymentMethod === "bank_transfer" && !body.settlementConfirmed) {
      return NextResponse.json(
        { error: "Cần xác nhận đã hoàn tiền chuyển khoản cho khách." },
        { status: 409 },
      );
    }

    const refunded = await refundPaidPosOrder(order, {
      reason: body.reason?.trim() ?? "",
      actor: "pos",
    });
    return NextResponse.json({
      id: refunded.id,
      orderNumber: refunded.orderNumber,
      status: refunded.status,
      paymentStatus: refunded.paymentStatus,
      refundedAt: refunded.refundedAt,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REFUND_FAILED";
    const status = ["ORDER_NOT_PAID", "REFUND_REASON_REQUIRED"].includes(code)
      ? 409
      : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
