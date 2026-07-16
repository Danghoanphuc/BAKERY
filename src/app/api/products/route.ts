import { NextResponse } from "next/server";
import { getAllProducts, createProduct } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdentifierValidationError } from "@/lib/product-identifiers";
import { findWorkspaceCardTemplate, mergeWorkspaceCardTemplate } from "@/lib/workspace-card-template";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const data = await request.json();
    const products = await getAllProducts();
    const identifierError = getIdentifierValidationError(products, data);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await createProduct({
      ...data,
      workspaceCards: mergeWorkspaceCardTemplate(data.workspaceCards, findWorkspaceCardTemplate(products)),
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
