import { NextResponse } from "next/server";
import { getOrders } from "@/lib/db";
import { expireUnpaidBankTransferOrder } from "@/lib/payment-expiry";

export async function GET() {
  try {
    const orders = await Promise.all(
      (await getOrders()).map((order) => expireUnpaidBankTransferOrder(order)),
    );
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
