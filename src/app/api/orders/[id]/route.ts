import { NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const order = await updateOrder(id, data);
    return NextResponse.json(order);
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
      { status: 500 }
    );
  }
}
