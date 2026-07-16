import { NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cancelPayOSPaymentLink } from "@/lib/payos";
import { releasePosInventoryReservation } from "@/lib/firebase/pos-inventory";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: Params) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order || order.salesChannel !== "pos") {
    return NextResponse.json({ error: "Không tìm thấy đơn POS." }, { status: 404 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Đơn đã thanh toán nên không thể huỷ mã QR." },
      { status: 409 },
    );
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (order.payosOrderCode) {
    await cancelPayOSPaymentLink(order.payosOrderCode, "Thu ngân huỷ thanh toán POS");
  }
  await releasePosInventoryReservation(order.id);

  await updateOrder(order.id, {
    status: "cancelled",
    paymentStatus: "unpaid",
    cancelReason: "Thu ngân huỷ thanh toán QR",
    statusHistory: [
      ...(order.statusHistory ?? []),
      {
        status: "cancelled",
        at: new Date().toISOString(),
        actor: "pos",
        note: "Huỷ mã QR tại quầy",
      },
    ],
  });

  return NextResponse.json({ ok: true, status: "cancelled" });
}
