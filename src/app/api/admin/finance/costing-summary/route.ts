import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { summarizeProductCost } from "@/features/finance";
import type { FinanceIngredient, IngredientBaseUnit, Product, RecipeVersion } from "@/types";

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value &&
      typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return new Date(String(value));
}

function mapIngredient(
  id: string,
  data: Record<string, unknown>,
): FinanceIngredient {
  return {
    id,
    code: String(data.code ?? ""),
    groupCode: typeof data.groupCode === "string" ? data.groupCode : undefined,
    name: String(data.name ?? ""),
    baseUnit: data.baseUnit as IngredientBaseUnit,
    costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
    isActive: data.isActive !== false,
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

function mapRecipe(id: string, data: Record<string, unknown>): RecipeVersion {
  return {
    id,
    productId: String(data.productId ?? ""),
    version: Number(data.version ?? 1),
    status: data.status as RecipeVersion["status"],
    effectiveFrom: toDate(data.effectiveFrom),
    yieldQuantity: Number(data.yieldQuantity ?? 0),
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients as RecipeVersion["ingredients"]
      : [],
    packagingCostPerBatch: Number(data.packagingCostPerBatch ?? 0),
    directLaborCostPerBatch: Number(data.directLaborCostPerBatch ?? 0),
    overheadCostPerBatch: Number(data.overheadCostPerBatch ?? 0),
    wasteBasisPoints: Number(data.wasteBasisPoints ?? 0),
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const database = getAdminFirestore();
    const [productSnapshot, ingredientSnapshot, recipeSnapshot] = await Promise.all([
      database.collection("products").get(),
      database.collection("finance_ingredients").get(),
      database.collection("finance_recipe_versions").where("status", "==", "active").get(),
    ]);
    const products = productSnapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Product[];
    const ingredients = ingredientSnapshot.docs.map((item) =>
      mapIngredient(item.id, item.data()));
    const recipes = recipeSnapshot.docs.map((item) => mapRecipe(item.id, item.data()));
    const ingredientsById = new Map(ingredients.map((item) => [item.id, item]));
    const recipesByProductId = new Map(recipes.map((item) => [item.productId, item]));
    const byProductId = Object.fromEntries(products.map((product) => [
      product.id,
      summarizeProductCost(
        product,
        recipesByProductId.get(product.id),
        ingredientsById,
      ),
    ]));
    const values = Object.values(byProductId);
    return NextResponse.json({
      byProductId,
      coverage: {
        total: products.length,
        recipe: values.filter((item) => item.source === "recipe").length,
        legacy: values.filter((item) => item.source === "legacy").length,
        missing: values.filter((item) => item.source === "missing").length,
      },
    });
  } catch (error) {
    console.error("Failed to build costing summary:", error);
    return NextResponse.json(
      { error: "Failed to load costing summary" },
      { status: 500 },
    );
  }
}
