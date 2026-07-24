import { NextResponse } from "next/server";
import { approveBudget } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    await approveBudget((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const missing = error instanceof Error && error.message === "BUDGET_NOT_FOUND";
    return NextResponse.json({ error: missing ? "Budget not found" : "Failed to approve budget" }, { status: missing ? 404 : 500 });
  }
}

