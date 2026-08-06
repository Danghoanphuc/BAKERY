import { NextResponse } from "next/server";
import {
  getManufacturingOverheadSettings,
  saveManufacturingOverheadSettings,
} from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(await getManufacturingOverheadSettings());
  } catch {
    return NextResponse.json(
      { error: "Failed to load manufacturing overhead settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(
      await saveManufacturingOverheadSettings(await request.json()),
    );
  } catch (error) {
    const invalid =
      error instanceof Error &&
      error.message === "INVALID_MANUFACTURING_OVERHEAD_SETTINGS";
    return NextResponse.json(
      {
        error: invalid
          ? "Invalid manufacturing overhead settings"
          : "Failed to save manufacturing overhead settings",
      },
      { status: invalid ? 400 : 500 },
    );
  }
}
