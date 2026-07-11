import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/db";
import {
  canAccessCustomerOrder,
  getCustomerOrderAccess,
} from "@/lib/customer-order-access";
import {
  expireUnpaidBankTransferOrder,
  getBankTransferPaymentExpiresAt,
  getPaymentSecondsRemaining,
} from "@/lib/payment-expiry";
import { syncPendingOrderFromPayOS } from "@/lib/payos-order-sync";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu mã đơn hàng." }, { status: 400 });
    }

    const access = await getCustomerOrderAccess(request);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 },
      );
    }

    if (!canAccessCustomerOrder(order, access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const syncedOrder = await expireUnpaidBankTransferOrder(
      await syncPendingOrderFromPayOS(order),
    );
    const expiresAt = getBankTransferPaymentExpiresAt(syncedOrder);

    return NextResponse.json({
      id: syncedOrder.id,
      orderNumber: syncedOrder.orderNumber,
      status: syncedOrder.status,
      totalAmount: syncedOrder.totalAmount,
      paymentStatus: syncedOrder.paymentStatus ?? "unpaid",
      paymentMethod: syncedOrder.paymentMethod,
      payosOrderCode: syncedOrder.payosOrderCode,
      payosCheckoutUrl: syncedOrder.payosCheckoutUrl,
      payosQrCode: syncedOrder.payosQrCode,
      loyaltyPointsEarned: syncedOrder.loyaltyPointsEarned ?? 0,
      expiresAt: expiresAt?.toISOString(),
      secondsRemaining: getPaymentSecondsRemaining(syncedOrder),
      cancelReason: syncedOrder.cancelReason,
    });
  } catch (error) {
    console.error("Online payment status failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra trạng thái thanh toán." },
      { status: 500 },
    );
  }
}
