import { NextResponse } from "next/server";
import { createWholesaleProduct, listWholesaleRecords } from "@/lib/wholesale-admin-store";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdentifierValidationError } from "@/lib/product-identifiers";
import { findWorkspaceCardTemplate, mergeWorkspaceCardTemplate } from "@/lib/workspace-card-template";
import type { Product } from "@/types";

export async function GET() {
  try {
    const products = await listWholesaleRecords("products");
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
    const products = await listWholesaleRecords("products");
    const identifierError = getIdentifierValidationError(products as unknown as Product[], data);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await createWholesaleProduct({
      ...data,
      workspaceCards: mergeWorkspaceCardTemplate(
        data.workspaceCards,
        findWorkspaceCardTemplate(products as unknown as Product[]),
      ),
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
