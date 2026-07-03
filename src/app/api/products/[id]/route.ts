import { NextResponse } from "next/server";
import { getProductByIdAdmin, updateProduct, deleteProduct } from "@/lib/db";

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
  try {
    const { id } = await context.params;
    const data = await request.json();
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
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    console.log("=== DELETE PRODUCT REQUEST ===");
    console.log("Product ID from params:", id);

    // First let's check if the id is valid
    if (!id || typeof id !== "string") {
      console.error("Invalid product ID:", id);
      return NextResponse.json(
        { error: "Invalid product ID" },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log("Calling deleteProduct with id:", id);
    await deleteProduct(id);
    console.log("deleteProduct completed successfully");

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("=== FULL ERROR DETAILS ===");
    console.error(error);
    return NextResponse.json(
      { 
        error: "Failed to delete product", 
        details: (error as Error).message,
        stack: (error as Error).stack 
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
