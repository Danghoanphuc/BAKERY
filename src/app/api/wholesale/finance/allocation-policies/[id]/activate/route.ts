import { NextResponse } from "next/server";
import { activatePolicy } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    await activatePolicy((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const missing = error instanceof Error && error.message === "ALLOCATION_POLICY_NOT_FOUND";
    return NextResponse.json({ error: missing ? "Policy not found" : "Failed to activate policy" }, { status: missing ? 404 : 500 });
  }
}

