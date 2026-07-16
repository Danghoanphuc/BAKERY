import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllProducts, getCategories, createCategory } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { attachProductStatsToCategories } from "@/lib/category-product-stats";

export async function GET() {
  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getAllProducts(),
    ]);
    return NextResponse.json(attachProductStatsToCategories(categories, products));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const data = await request.json();
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const iconUrl = typeof data.iconUrl === "string" ? data.iconUrl.trim() : "";

    if (!name || !iconUrl) {
      return NextResponse.json(
        { error: "Name and iconUrl are required" },
        { status: 400 },
      );
    }

    const category = await createCategory({
      name,
      iconUrl,
      displayOrder:
        typeof data.displayOrder === "number" ? data.displayOrder : undefined,
      isVisible:
        typeof data.isVisible === "boolean" ? data.isVisible : undefined,
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath("/category");

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
