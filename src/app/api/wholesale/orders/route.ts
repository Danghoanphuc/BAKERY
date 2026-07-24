import { NextResponse } from "next/server";
import { getWholesaleOrdersPage } from "@/lib/wholesale-admin-store";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const pageSize = Number(url.searchParams.get("limit") ?? 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const page = await getWholesaleOrdersPage(pageSize, cursor);
    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    if (error instanceof Error && error.message === "INVALID_ORDER_CURSOR") {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
