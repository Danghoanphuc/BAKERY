import { NextResponse } from "next/server";
import { getAllProducts, createProduct, deleteProduct } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createNextProductSku,
  createProductSku,
  ensureProductIdentifiers,
  getIdentifierValidationError,
} from "@/lib/product-identifiers";
import {
  getProductItemValidationError,
  prepareProductItemForCreate,
} from "@/lib/product-item-payload";
import { findWorkspaceCardTemplate, mergeWorkspaceCardTemplate } from "@/lib/workspace-card-template";
import { upsertFinanceIngredientProjection } from "@/features/finance/infrastructure/firestore-costing-repository";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getIngredientGroupSelectionError } from "@/lib/ingredient-groups";

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
    const normalized = prepareProductItemForCreate(await request.json());
    const validationError = getProductItemValidationError(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const groupError = await getIngredientGroupSelectionError(
      getAdminFirestore(),
      normalized,
    );
    if (groupError) {
      return NextResponse.json({ error: groupError }, { status: 400 });
    }
    const products = await getAllProducts();
    const defaultSku = createProductSku({
      itemType: normalized.itemType,
      name: normalized.name,
    });
    const shouldAllocateSequence = !normalized.sku || normalized.sku === defaultSku;
    const sku = shouldAllocateSequence
      ? createNextProductSku(products, {
          itemType: normalized.itemType,
          name: normalized.name,
        })
      : normalized.sku;
    const data = ensureProductIdentifiers(
      { ...normalized, sku },
      { replaceVariantSkus: shouldAllocateSequence && sku !== normalized.sku },
    );
    const identifierError = getIdentifierValidationError(products, data);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await createProduct({
      ...data,
      workspaceCards: mergeWorkspaceCardTemplate(
        "workspaceCards" in data ? data.workspaceCards : undefined,
        findWorkspaceCardTemplate(products),
      ),
    });
    if (data.itemType === "ingredient") {
      try {
        await upsertFinanceIngredientProjection({
          productId: product.id,
          code: data.sku,
          name: data.name,
          groupCode: data.ingredientGroup,
          baseUnit: data.baseUnit,
          purchasePackQuantity: data.purchasePackQuantity,
          referencePurchasePrice: data.referencePurchasePrice,
          isActive: data.lifecycleStatus === "active",
        });
      } catch (projectionError) {
        await deleteProduct(product.id);
        throw projectionError;
      }
    }
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    if ((error as Error).message === "PRODUCT_IDENTIFIER_EXISTS") {
      return NextResponse.json({ error: "SKU hoặc barcode đã được sử dụng." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
