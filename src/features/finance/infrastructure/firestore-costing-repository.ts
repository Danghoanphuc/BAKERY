import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import type { FinanceIngredient, IngredientBaseUnit, RecipeVersion } from "@/types";

const INGREDIENTS_COLLECTION = "finance_ingredients";
const RECIPES_COLLECTION = "finance_recipe_versions";
const INGREDIENT_COSTS_COLLECTION = "finance_ingredient_cost_versions";

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return new Date(String(value));
}

function mapIngredient(id: string, data: Record<string, unknown>): FinanceIngredient {
  return {
    id, code: String(data.code ?? ""), name: String(data.name ?? ""),
    baseUnit: data.baseUnit as IngredientBaseUnit,
    costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
    isActive: data.isActive !== false,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

function mapRecipe(id: string, data: Record<string, unknown>): RecipeVersion {
  return {
    id, productId: String(data.productId ?? ""), version: Number(data.version ?? 1),
    status: data.status as RecipeVersion["status"], effectiveFrom: toDate(data.effectiveFrom),
    yieldQuantity: Number(data.yieldQuantity ?? 0),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients as RecipeVersion["ingredients"] : [],
    packagingCostPerBatch: Number(data.packagingCostPerBatch ?? 0),
    directLaborCostPerBatch: Number(data.directLaborCostPerBatch ?? 0),
    overheadCostPerBatch: Number(data.overheadCostPerBatch ?? 0),
    wasteBasisPoints: Number(data.wasteBasisPoints ?? 0),
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

export async function getFinanceIngredients() {
  const snapshot = await getDocs(collection(db, INGREDIENTS_COLLECTION));
  return snapshot.docs.map((item) => mapIngredient(item.id, item.data()));
}

export async function getActiveRecipeVersions() {
  const snapshot = await getDocs(query(collection(db, RECIPES_COLLECTION), where("status", "==", "active")));
  return snapshot.docs.map((item) => mapRecipe(item.id, item.data()));
}

export async function getRecipeVersionById(recipeId: string) {
  const snapshot = await getDocs(collection(db, RECIPES_COLLECTION));
  const recipe = snapshot.docs.find((item) => item.id === recipeId);
  return recipe ? mapRecipe(recipe.id, recipe.data()) : null;
}

export async function createFinanceIngredient(
  input: Omit<FinanceIngredient, "id" | "updatedAt">,
) {
  const reference = await addDoc(collection(db, INGREDIENTS_COLLECTION), {
    ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: reference.id, ...input, updatedAt: new Date() };
}

export async function recordIngredientCost(input: {
  ingredientId: string;
  costPerBaseUnitMicros: number;
  effectiveFrom: Date;
  source?: string;
  createdBy: string;
}) {
  const batch = writeBatch(db);
  const ingredientRef = doc(db, INGREDIENTS_COLLECTION, input.ingredientId);
  const costRef = doc(collection(db, INGREDIENT_COSTS_COLLECTION));
  batch.update(ingredientRef, {
    costPerBaseUnitMicros: input.costPerBaseUnitMicros,
    updatedAt: serverTimestamp(),
  });
  batch.set(costRef, {
    ingredientId: input.ingredientId,
    costPerBaseUnitMicros: input.costPerBaseUnitMicros,
    effectiveFrom: input.effectiveFrom,
    createdBy: input.createdBy,
    ...(input.source ? { source: input.source } : {}),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return { id: costRef.id, ...input, createdAt: new Date() };
}

export async function createRecipeVersion(
  input: Omit<RecipeVersion, "id" | "createdAt" | "updatedAt">,
) {
  const existing = await getDocs(query(
    collection(db, RECIPES_COLLECTION), where("productId", "==", input.productId),
  ));
  const nextVersion = Math.max(0, ...existing.docs.map((item) => Number(item.data().version ?? 0))) + 1;
  const reference = await addDoc(collection(db, RECIPES_COLLECTION), {
    ...input, version: nextVersion, status: "draft",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { ...input, id: reference.id, version: nextVersion, status: "draft" as const, createdAt: new Date(), updatedAt: new Date() };
}

export async function activateRecipeVersion(recipeId: string) {
  const allRecipes = await getDocs(collection(db, RECIPES_COLLECTION));
  const target = allRecipes.docs.find((item) => item.id === recipeId);
  if (!target) throw new Error("RECIPE_NOT_FOUND");
  const productId = String(target.data().productId ?? "");
  const batch = writeBatch(db);
  for (const recipe of allRecipes.docs) {
    if (recipe.data().productId !== productId) continue;
    batch.update(recipe.ref, {
      status: recipe.id === recipeId ? "active" : "retired",
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}
