import { NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/db";
import { expireUnpaidBankTransferOrder } from "@/lib/payment-expiry";
import { captureOrderFinancials } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

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
    const data = await request.json();
    await updateOrder(id, data);
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await captureOrderFinancials(order, "admin");

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
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
