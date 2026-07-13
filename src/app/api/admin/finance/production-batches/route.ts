import { NextResponse } from "next/server";
import { completeProductionBatch } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const batch = await completeProductionBatch({
      ...body, occurredAt: new Date(body.occurredAt), actor: "admin",
    });
    return NextResponse.json(batch, { status: batch ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_PRODUCTION_BATCH";
    const insufficient = message.startsWith("INSUFFICIENT_INVENTORY:");
    return NextResponse.json(
      { error: invalid ? "Invalid production batch" : insufficient ? message : "Failed to complete batch" },
      { status: invalid ? 400 : insufficient ? 409 : 500 },
    );
  }
}

