import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteWholesaleCategory, getWholesaleRecord, updateWholesaleRecord } from "@/lib/wholesale-admin-store";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const category = await getWholesaleRecord("categories", id);
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const data = await request.json();
    const category = await updateWholesaleRecord("categories", id, data);

    revalidatePath("/");
    revalidatePath("/wholesale/categories");
    revalidatePath("/category");

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    await deleteWholesaleCategory(id);

    revalidatePath("/");
    revalidatePath("/wholesale/categories");
    revalidatePath("/category");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    if (error instanceof Error && error.message === "CATEGORY_HAS_PRODUCTS") {
      return NextResponse.json(
        { error: "Category still has products" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
