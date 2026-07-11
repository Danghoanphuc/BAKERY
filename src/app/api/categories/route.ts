import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllProducts, getCategories, createCategory } from "@/lib/db";
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
  try {
    const data = await request.json();
    const category = await createCategory(data);

    // Revalidate pages that display categories
    revalidatePath("/");
    revalidatePath("/admin/categories");

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
