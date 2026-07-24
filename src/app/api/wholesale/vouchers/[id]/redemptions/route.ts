import { NextResponse } from "next/server";
import { getVoucherRedemptions } from "@/lib/wholesale-firebase";

function serializeDate(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeDate(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeDate(item),
      ]),
    );
  }

  return value;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const redemptions = await getVoucherRedemptions(id);

    return NextResponse.json({
      redemptions: serializeDate(redemptions),
    });
  } catch (error) {
    console.error("Failed to load voucher redemptions:", error);
    return NextResponse.json(
      { error: "Failed to load voucher redemptions" },
      { status: 500 },
    );
  }
}
