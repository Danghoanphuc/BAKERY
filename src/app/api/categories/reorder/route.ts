import { NextResponse } from "next/server";
import { reorderCategories } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      return NextResponse.json(
        { error: "No categories to reorder" },
        { status: 400 },
      );
    }

    await reorderCategories(
      items.map((item: { id: string; displayOrder: number }, index: number) => ({
        id: item.id,
        displayOrder: Number.isFinite(item.displayOrder)
          ? item.displayOrder
          : index,
      })),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reordering categories:", error);
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 },
    );
  }
}
