import { NextResponse } from "next/server";
import { getAllProducts, getProductByIdAdmin, updateProduct, deleteProduct } from "@/lib/db";
import { getAdminRecord } from "@/lib/admin-record-store";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ensureProductIdentifiers, getIdentifierValidationError } from "@/lib/product-identifiers";
import {
  getProductItemValidationError,
  getSemiFinishedActivationError,
  normalizeProductItemInput,
} from "@/lib/product-item-payload";
import { getCostingWorkspace } from "@/features/finance";
import { upsertFinanceIngredientProjection } from "@/features/finance/infrastructure/firestore-costing-repository";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getIngredientGroupSelectionError } from "@/lib/ingredient-groups";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await getAdminRecord("products", id);
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
    const currentProduct = await getProductByIdAdmin(id);
    if (!currentProduct) {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm" },
        { status: 404 },
      );
    }
    if (patch.itemType && patch.itemType !== currentProduct.itemType) {
      return NextResponse.json(
        { error: "Loại hàng không thể thay đổi sau khi đã tạo." },
        { status: 400 },
      );
    }

    // Availability controls send partial updates. Merge first so those updates
    // cannot accidentally replace the existing SKU/barcode with generated ones.
    const normalized = normalizeProductItemInput({
      ...currentProduct,
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
    const data = ensureProductIdentifiers(normalized);
    const identifierError = getIdentifierValidationError(await getAllProducts(), data, id);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await updateProduct(id, data);
    if (data.itemType === "ingredient") {
      await upsertFinanceIngredientProjection({
        productId: id,
        code: data.sku,
        name: data.name,
        groupCode: data.ingredientGroup,
        baseUnit: data.baseUnit,
        purchasePackQuantity: data.purchasePackQuantity,
        referencePurchasePrice: data.referencePurchasePrice,
        isActive: data.lifecycleStatus === "active",
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

    const product = await getProductByIdAdmin(id);
    await deleteProduct(id);
    if (product?.itemType === "ingredient") {
      await upsertFinanceIngredientProjection({
        productId: id,
        code: product.sku ?? "",
        name: product.name,
        groupCode: product.ingredientGroup ?? "OTHER",
        baseUnit: product.baseUnit ?? "gram",
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
