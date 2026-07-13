import { NextResponse } from "next/server";
import { getInventoryBalances } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getInventoryBalances());
}

