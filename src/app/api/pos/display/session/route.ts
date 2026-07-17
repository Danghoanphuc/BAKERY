import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createPosDisplaySession } from "@/lib/pos-display-session-server";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(await createPosDisplaySession());
  } catch (error) {
    console.error("Create POS display session failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo phiên màn hình khách." },
      { status: 500 },
    );
  }
}
