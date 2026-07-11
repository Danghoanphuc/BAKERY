import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCategories, createCategory } from "@/lib/db";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
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
