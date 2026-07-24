import { NextResponse } from "next/server";
import { captureOrderFinancials } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrderById, updateOrder } from "@/lib/wholesale-db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    await captureOrderFinancials(order, "admin");
    await updateOrder(id, {
      financialSyncPending: false,
      financialSyncError: "",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Order financial reconciliation failed:", error);
    await updateOrder(id, {
      financialSyncPending: true,
      financialSyncError:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "FINANCIAL_SYNC_FAILED",
    });
    return NextResponse.json(
      { error: "Không thể đồng bộ tài chính lúc này" },
      { status: 503 },
    );
  }
}
