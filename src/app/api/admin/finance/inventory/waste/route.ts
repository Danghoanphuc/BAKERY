import { NextResponse } from "next/server";
import { getWasteRecords, recordInventoryWaste } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getWasteRecords());
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const waste = await recordInventoryWaste({
      ...body, occurredAt: new Date(body.occurredAt), actor: "admin",
    });
    return NextResponse.json(waste, { status: waste ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_WASTE_RECORD";
    const insufficient = message.startsWith("INSUFFICIENT_INVENTORY:");
    return NextResponse.json({ error: insufficient ? message : invalid ? "Invalid waste record" : "Failed to record waste" }, { status: invalid ? 400 : insufficient ? 409 : 500 });
  }
}
