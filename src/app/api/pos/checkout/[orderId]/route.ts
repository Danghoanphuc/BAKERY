import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/db";
import { syncPendingOrderFromPayOS } from "@/lib/payos-order-sync";
import { requireAdmin } from "@/lib/auth/require-admin";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Thiếu mã đơn hàng." }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 },
      );
    }

    const syncedOrder = await syncPendingOrderFromPayOS(order);

    return NextResponse.json({
      id: syncedOrder.id,
      orderNumber: syncedOrder.orderNumber,
      paymentStatus: syncedOrder.paymentStatus ?? "unpaid",
      totalAmount: syncedOrder.totalAmount,
      status: syncedOrder.status,
    });
  } catch (error) {
    console.error("POS checkout status failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra trạng thái thanh toán." },
      { status: 500 },
    );
  }
}
