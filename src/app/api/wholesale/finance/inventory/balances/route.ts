import { NextResponse } from "next/server";
import { getInventoryBalances } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  const filter = itemId && (itemType === "product" || itemType === "ingredient")
    ? { itemType: itemType as "product" | "ingredient", itemId }
    : undefined;
  return NextResponse.json(await getInventoryBalances(filter));
}
