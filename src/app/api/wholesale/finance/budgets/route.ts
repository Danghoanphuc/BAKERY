import { NextResponse } from "next/server";
import { createMonthlyBudget, getManagementWorkspace } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const period = new URL(request.url).searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  return NextResponse.json((await getManagementWorkspace(period)).budgets);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await createMonthlyBudget(await request.json()), { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_MONTHLY_BUDGET";
    return NextResponse.json({ error: invalid ? "Invalid monthly budget" : "Failed to create budget" }, { status: invalid ? 400 : 500 });
  }
}
