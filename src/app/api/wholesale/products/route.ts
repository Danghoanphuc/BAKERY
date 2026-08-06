import { NextResponse } from "next/server";
import { createWholesaleProduct, deleteWholesaleRecord, listWholesaleRecords, updateWholesaleRecord } from "@/lib/wholesale-admin-store";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
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
import type { Product } from "@/types";
import { upsertFinanceIngredientProjection } from "@/features/wholesale-finance/infrastructure/firestore-costing-repository";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import { getIngredientGroupSelectionError } from "@/lib/ingredient-groups";
import { activateRecipe, addRecipeVersion } from "@/features/wholesale-finance";
import type { RecipeVersion } from "@/types";

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

  let createdProductId: string | null = null;
  let createdRecipeId: string | null = null;
  try {
    const raw = await request.json() as Record<string, unknown>;
    const rawBom = raw.bom && typeof raw.bom === "object"
      ? raw.bom as Record<string, unknown>
      : null;
    const normalized = prepareProductItemForCreate(raw);
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
    const products = await listWholesaleRecords("products");
    const typedProducts = products as unknown as Product[];
    const defaultSku = createProductSku({
      itemType: normalized.itemType,
      name: normalized.name,
    });
    const shouldAllocateSequence = !normalized.sku || normalized.sku === defaultSku;
    const sku = shouldAllocateSequence
      ? createNextProductSku(typedProducts, {
          itemType: normalized.itemType,
          name: normalized.name,
        })
      : normalized.sku;
    const data = ensureProductIdentifiers(
      { ...normalized, sku },
      { replaceVariantSkus: shouldAllocateSequence && sku !== normalized.sku },
    );
    const identifierError = getIdentifierValidationError(typedProducts, data);
    if (identifierError) return NextResponse.json({ error: identifierError }, { status: 409 });
    const product = await createWholesaleProduct({
      ...data,
      workspaceCards: mergeWorkspaceCardTemplate(
        "workspaceCards" in data ? data.workspaceCards : undefined,
        findWorkspaceCardTemplate(typedProducts),
      ),
    });
    if (!product) throw new Error("PRODUCT_CREATE_FAILED");
    createdProductId = product.id;
    if (data.itemType === "ingredient") {
      try {
        await upsertFinanceIngredientProjection({
          productId: product.id,
          code: data.sku,
          name: data.name,
          groupCode: data.ingredientGroup,
          baseUnit: data.baseUnit,
          purchaseUnit: data.purchaseUnit,
          purchasePackQuantity: data.purchasePackQuantity,
          referencePurchasePrice: data.referencePurchasePrice,
          isActive: data.lifecycleStatus === "active",
        });
      } catch (projectionError) {
        await deleteWholesaleRecord("products", product.id);
        throw projectionError;
      }
    }
    if (data.itemType === "semi_finished" && rawBom) {
      const actor = getAdminSession(request)?.id ?? "admin";
      const recipe = await addRecipeVersion({
        productId: product.id,
        effectiveFrom: new Date(),
        yieldQuantity: Number(rawBom.yieldQuantity ?? 0),
        ingredients: Array.isArray(rawBom.ingredients)
          ? rawBom.ingredients as RecipeVersion["ingredients"]
          : [],
        packagingCostPerBatch: Number(rawBom.packagingCostPerBatch ?? 0),
        directLaborCostPerBatch: Number(rawBom.directLaborCostPerBatch ?? 0),
        overheadCostPerBatch: Number(rawBom.overheadCostPerBatch ?? 0),
        wasteBasisPoints: Number(rawBom.wasteBasisPoints ?? 0),
        ...(Array.isArray(rawBom.packagingCostLines)
          ? { packagingCostLines: rawBom.packagingCostLines as RecipeVersion["packagingCostLines"] }
          : {}),
        ...(Array.isArray(rawBom.directLaborCostLines)
          ? { directLaborCostLines: rawBom.directLaborCostLines as RecipeVersion["directLaborCostLines"] }
          : {}),
        ...(rawBom.wasteCalculation && typeof rawBom.wasteCalculation === "object"
          ? { wasteCalculation: rawBom.wasteCalculation as RecipeVersion["wasteCalculation"] }
          : {}),
      }, actor);
      createdRecipeId = recipe.id;
      await activateRecipe(recipe.id, actor);
      await updateWholesaleRecord("products", product.id, {
        lifecycleStatus: "active",
        manufacturingOutputQuantity: recipe.yieldQuantity,
      });
      return NextResponse.json({
        ...product,
        lifecycleStatus: "active",
        manufacturingOutputQuantity: recipe.yieldQuantity,
      }, { status: 201 });
    }
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (createdRecipeId) {
      await getAdminFirestore().collection("finance_recipe_versions")
        .doc(createdRecipeId).delete().catch(() => undefined);
    }
    if (createdProductId) {
      await deleteWholesaleRecord("products", createdProductId).catch(() => undefined);
    }
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
