import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { listRecentSecurityEvents } from "@/lib/security/wholesale-security-events";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const events = await listRecentSecurityEvents(150);
  return NextResponse.json({ events });
}
