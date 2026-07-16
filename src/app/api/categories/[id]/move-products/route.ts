import { NextResponse } from "next/server";
import { moveCategoryProducts } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const data = await request.json();
    const toCategoryId = String(data.toCategoryId ?? "");

    if (!toCategoryId || toCategoryId === id) {
      return NextResponse.json(
        { error: "A different destination category is required" },
        { status: 400 },
      );
    }

    const movedCount = await moveCategoryProducts(id, toCategoryId);
    return NextResponse.json({ movedCount });
  } catch (error) {
    console.error("Error moving category products:", error);
    return NextResponse.json(
      { error: "Failed to move products" },
      { status: 500 },
    );
  }
}
