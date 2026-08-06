import { NextResponse } from "next/server";
import { deleteWholesaleRecord, getWholesaleRecord, listWholesaleRecords, updateWholesaleRecord } from "@/lib/wholesale-admin-store";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ensureProductIdentifiers, getIdentifierValidationError } from "@/lib/product-identifiers";
import {
  getProductItemValidationError,
  getSemiFinishedActivationError,
  normalizeProductItemInput,
} from "@/lib/product-item-payload";
import type { Product } from "@/types";
import { getCostingWorkspace } from "@/features/wholesale-finance";
import { upsertFinanceIngredientProjection } from "@/features/wholesale-finance/infrastructure/firestore-costing-repository";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import { getIngredientGroupSelectionError } from "@/lib/ingredient-groups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await getWholesaleRecord("products", id);
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
    const patch = await request.json();
    const currentProduct = await getWholesaleRecord("products", id);
    if (!currentProduct) {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm" },
        { status: 404 },
      );
    }
    if (
      patch.itemType &&
      patch.itemType !== (currentProduct as unknown as Product).itemType
    ) {
      return NextResponse.json(
        { error: "Loại hàng không thể thay đổi sau khi đã tạo." },
        { status: 400 },
      );
    }

    const normalized = normalizeProductItemInput({
      ...(currentProduct as unknown as Product),
      ...patch,
      id,
    });
    const validationError = getProductItemValidationError(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    if (
      normalized.itemType === "semi_finished" &&
      normalized.lifecycleStatus === "active"
    ) {
      const costing = await getCostingWorkspace();
      const activationError = getSemiFinishedActivationError(
        normalized,
        costing.recipes.some(
          (recipe) =>
            recipe.productId === id && recipe.status === "active",
        ),
      );
      if (activationError) {
        return NextResponse.json({ error: activationError }, { status: 409 });
      }
    }
    const groupError = await getIngredientGroupSelectionError(
      getAdminFirestore(),
      normalized,
    );
    if (groupError) {
      return NextResponse.json({ error: groupError }, { status: 400 });
    }
    const candidate = ensureProductIdentifiers(normalized);
    const identifierError = getIdentifierValidationError(
      await listWholesaleRecords("products") as unknown as Product[],
      candidate,
      id,
    );
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const data = candidate;
    const product = await updateWholesaleRecord("products", id, data);
    if (candidate.itemType === "ingredient") {
      await upsertFinanceIngredientProjection({
        productId: id,
        code: candidate.sku,
        name: candidate.name,
        groupCode: candidate.ingredientGroup,
        baseUnit: candidate.baseUnit,
        purchaseUnit: candidate.purchaseUnit,
        purchasePackQuantity: candidate.purchasePackQuantity,
        referencePurchasePrice: candidate.referencePurchasePrice,
        isActive: candidate.lifecycleStatus === "active",
      });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    if ((error as Error).message === "PRODUCT_IDENTIFIER_EXISTS") {
      return NextResponse.json({ error: "SKU hoặc barcode đã được sử dụng." }, { status: 409 });
    }
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

    const product = await getWholesaleRecord("products", id) as unknown as Product | null;
    await deleteWholesaleRecord("products", id);
    if (product?.itemType === "ingredient") {
      await upsertFinanceIngredientProjection({
        productId: id,
        code: product.sku ?? "",
        name: product.name,
        groupCode: product.ingredientGroup ?? "OTHER",
        baseUnit: product.baseUnit ?? "gram",
        purchaseUnit: product.purchaseUnit,
        purchasePackQuantity: product.purchasePackQuantity ?? 1,
        referencePurchasePrice: product.referencePurchasePrice ?? 0,
        isActive: false,
      });
    }
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
