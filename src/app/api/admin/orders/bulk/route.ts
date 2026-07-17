import { NextResponse } from "next/server";
import type { OrderStatus } from "@/types";
import {
  getOrderById,
  transitionOrdersAtomically,
  updateOrder,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { captureOrderFinancials } from "@/features/finance";

const MAX_BULK_ORDERS = 100;

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      orderIds?: unknown;
      status?: unknown;
    };
    if (
      !Array.isArray(body.orderIds) ||
      body.orderIds.length === 0 ||
      body.orderIds.length > MAX_BULK_ORDERS ||
      body.orderIds.some((id) => typeof id !== "string") ||
      typeof body.status !== "string"
    ) {
      return NextResponse.json(
        { error: "Danh sách đơn hàng không hợp lệ" },
        { status: 400 },
      );
    }

    const orderIds = [...new Set(body.orderIds as string[])];
    const status = body.status as OrderStatus;
    await transitionOrdersAtomically(orderIds, status);
    const orders = (
      await Promise.all(orderIds.map((id) => getOrderById(id)))
    ).filter((order) => order !== null);

    const financialResults = await Promise.allSettled(
      orders.map((order) => captureOrderFinancials(order, "admin")),
    );
    try {
      await Promise.all(
        orders.map((order, index) => {
          const result = financialResults[index];
          const failed = result?.status === "rejected";
          return updateOrder(order.id, {
            financialSyncPending: failed,
            financialSyncError:
              failed && result.reason instanceof Error
                ? result.reason.message.slice(0, 500)
                : "",
          });
        }),
      );
    } catch (syncStatusError) {
      console.error("Unable to persist financial sync status:", syncStatusError);
    }

    return NextResponse.json({
      total: orders.length,
      financialSyncPending: financialResults.filter(
        (result) => result.status === "rejected",
      ).length,
    });
  } catch (error) {
    console.error("Error bulk updating admin orders:", error);
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Có đơn hàng không còn tồn tại. Vui lòng tải lại." },
        { status: 404 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "INVALID_STATUS_TRANSITION"
    ) {
      return NextResponse.json(
        { error: "Có đơn đã thay đổi trạng thái. Dữ liệu chưa được cập nhật." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Không thể cập nhật hàng loạt. Dữ liệu chưa được thay đổi." },
      { status: 500 },
    );
  }
}
