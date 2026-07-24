import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createWholesaleCategory, listWholesaleCategories, listWholesaleRecords } from "@/lib/wholesale-admin-store";
import { requireAdmin } from "@/lib/auth/require-admin";
import { attachProductStatsToCategories } from "@/lib/category-product-stats";
import type { Category, Product } from "@/types";

export async function GET() {
  try {
    const [categories, products] = await Promise.all([
      listWholesaleCategories(),
      listWholesaleRecords("products"),
    ]);
    return NextResponse.json(attachProductStatsToCategories(
      categories as unknown as Category[],
      products as unknown as Product[],
    ));
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

    const category = await createWholesaleCategory({
      name,
      iconUrl,
      displayOrder:
        typeof data.displayOrder === "number" ? data.displayOrder : undefined,
      isVisible:
        typeof data.isVisible === "boolean" ? data.isVisible : undefined,
    });

    revalidatePath("/");
    revalidatePath("/wholesale/categories");
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
