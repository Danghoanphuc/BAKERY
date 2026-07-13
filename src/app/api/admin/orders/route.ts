import { NextResponse } from "next/server";
import { getOrders } from "@/lib/db";
import { expireUnpaidBankTransferOrder } from "@/lib/payment-expiry";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
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
