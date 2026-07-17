import { NextResponse } from "next/server";
import {
  getOrderById,
  transitionOrderAtomically,
  updateOrder,
  updateOrderOperationsAtomically,
} from "@/lib/db";
import { expireUnpaidBankTransferOrder } from "@/lib/payment-expiry";
import { captureOrderFinancials } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseOrderUpdate } from "@/lib/orders/order-update";

function serializeForJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item));
  }

  if (value && typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date.toISOString()
        : null;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeForJson(item),
      ]),
    );
  }

  return value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(
      serializeForJson(await expireUnpaidBankTransferOrder(order)),
    );
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const currentOrder = await getOrderById(id);

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = parseOrderUpdate(await request.json());
    if (data.status === "cancelled" && !data.cancelReason?.trim()) {
      return NextResponse.json(
        { error: "Cần nhập lý do hủy đơn" },
        { status: 400 },
      );
    }
    if (
      data.paymentStatus === "refunded" &&
      currentOrder.paymentStatus !== "refunded"
    ) {
      return NextResponse.json(
        { error: "Hãy dùng chức năng hoàn tiền để ghi nhận giao dịch" },
        { status: 400 },
      );
    }

    if (data.status) {
      await transitionOrderAtomically(id, data.status, {
        actor: "admin",
        note: data.status === "cancelled" ? data.cancelReason : undefined,
      });
    } else {
      await updateOrderOperationsAtomically(id, data);
    }

    let order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (data.status || data.paymentStatus) {
      let financialSyncError: unknown = null;
      try {
        await captureOrderFinancials(order, "admin");
      } catch (error) {
        financialSyncError = error;
        console.error("Deferred order financial sync:", error);
      }

      try {
        await updateOrder(id, {
          financialSyncPending: Boolean(financialSyncError),
          financialSyncError:
            financialSyncError instanceof Error
              ? financialSyncError.message.slice(0, 500)
              : financialSyncError
                ? "FINANCIAL_SYNC_FAILED"
                : "",
        });
      } catch (syncStatusError) {
        console.error("Unable to persist financial sync status:", syncStatusError);
      }
      order = (await getOrderById(id)) ?? order;
    }

    return NextResponse.json(serializeForJson(order));
  } catch (error) {
    console.error("Error updating order:", error);
    if (
      error instanceof Error &&
      error.message === "INVALID_STATUS_TRANSITION"
    ) {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (
      error instanceof Error &&
      [
        "INVALID_ORDER_UPDATE",
        "UNSUPPORTED_ORDER_UPDATE_FIELD",
        "INVALID_ORDER_STATUS",
        "INVALID_PAYMENT_STATUS",
        "INVALID_ORDER_TEXT_FIELD",
      ].includes(error.message)
    ) {
      return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
