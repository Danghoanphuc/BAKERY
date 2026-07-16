import { NextResponse } from "next/server";
import { isPayOSEnabled } from "@/lib/payos";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    payosEnabled: isPayOSEnabled() });
}
