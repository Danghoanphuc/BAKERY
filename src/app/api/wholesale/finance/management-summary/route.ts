import { NextResponse } from "next/server";
import { getManagementAccountingReport } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const period = new URL(request.url).searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    return NextResponse.json(await getManagementAccountingReport(period));
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_PERIOD";
    return NextResponse.json({ error: invalid ? "Invalid period" : "Failed to load management summary" }, { status: invalid ? 400 : 500 });
  }
}

