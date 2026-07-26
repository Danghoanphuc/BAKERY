import { NextResponse } from "next/server";
import { recordInventoryAdjustment } from "@/features/wholesale-finance";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const session = getAdminSession(request);
    const adjustment = await recordInventoryAdjustment({
      ...body,
      occurredAt: new Date(body.occurredAt),
      actor: session?.id ?? "admin",
    });
    return NextResponse.json(adjustment, { status: adjustment ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_INVENTORY_ADJUSTMENT";
    const insufficient = message.startsWith("INSUFFICIENT_INVENTORY:");
    return NextResponse.json(
      { error: invalid ? "Invalid inventory adjustment" : insufficient ? message : "Failed to adjust inventory" },
      { status: invalid ? 400 : insufficient ? 409 : 500 },
    );
  }
}
