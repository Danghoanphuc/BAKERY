import { NextResponse } from "next/server";
import { getAllProducts, getProductByIdAdmin, updateProduct, deleteProduct } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdentifierValidationError } from "@/lib/product-identifiers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await getProductByIdAdmin(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
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
    const identifierError = getIdentifierValidationError(await getAllProducts(), data, id);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await updateProduct(id, data);
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
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

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
