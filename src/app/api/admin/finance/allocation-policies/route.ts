import { NextResponse } from "next/server";
import { createAllocationPolicy, getManagementWorkspace } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const period = new Date().toISOString().slice(0, 7);
  return NextResponse.json((await getManagementWorkspace(period)).policies);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await createAllocationPolicy(await request.json()), { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_ALLOCATION_POLICY";
    return NextResponse.json({ error: invalid ? "Invalid allocation policy" : "Failed to create policy" }, { status: invalid ? 400 : 500 });
  }
}
