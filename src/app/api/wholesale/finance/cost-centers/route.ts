import { NextResponse } from "next/server";
import { createCostCenter, getManagementConfiguration } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const period = new Date().toISOString().slice(0, 7);
  return NextResponse.json((await getManagementConfiguration(period)).costCenters);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await createCostCenter(await request.json()), { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_COST_CENTER";
    return NextResponse.json({ error: invalid ? "Invalid cost center" : "Failed to create cost center" }, { status: invalid ? 400 : 500 });
  }
}

