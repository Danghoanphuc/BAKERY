import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { FinanceIngredient, IngredientBaseUnit, RecipeVersion } from "@/types";
import { formatIngredientCode, normalizeIngredientGroup } from "../domain/ingredient-code";

const INGREDIENTS_COLLECTION = "finance_ingredients";
const RECIPES_COLLECTION = "finance_recipe_versions";
const INGREDIENT_COSTS_COLLECTION = "finance_ingredient_cost_versions";
const COUNTERS_COLLECTION = "finance_counters";

const db = () => getAdminFirestore();

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return new Date(String(value));
}

function mapIngredient(id: string, data: Record<string, unknown>): FinanceIngredient {
  return {
    id,
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    baseUnit: data.baseUnit as IngredientBaseUnit,
    costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
    isActive: data.isActive !== false,
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
  const snapshot = await db().collection(INGREDIENTS_COLLECTION).get();
  return snapshot.docs.map((item) => mapIngredient(item.id, item.data()));
}

export async function getActiveRecipeVersions() {
  const snapshot = await db().collection(RECIPES_COLLECTION).where("status", "==", "active").get();
  return snapshot.docs.map((item) => mapRecipe(item.id, item.data()));
}

export async function getAllRecipeVersions() {
  const snapshot = await db().collection(RECIPES_COLLECTION).get();
  return snapshot.docs.map((item) => mapRecipe(item.id, item.data()))
    .sort((left, right) => right.version - left.version);
}

export async function getRecipeVersionById(recipeId: string) {
  const snapshot = await db().collection(RECIPES_COLLECTION).doc(recipeId).get();
  return snapshot.exists ? mapRecipe(snapshot.id, snapshot.data() ?? {}) : null;
}

export async function createFinanceIngredient(
  input: Omit<FinanceIngredient, "id" | "updatedAt" | "code"> & { groupCode: string },
) {
  const groupCode = normalizeIngredientGroup(input.groupCode);
  const ingredientRef = db().collection(INGREDIENTS_COLLECTION).doc();
  let code = "";

  await db().runTransaction(async (transaction) => {
    const counterRef = db().collection(COUNTERS_COLLECTION).doc(`ingredient_code_${groupCode}`);
    const [counter, ingredients] = await Promise.all([
      transaction.get(counterRef),
      transaction.get(db().collection(INGREDIENTS_COLLECTION)),
    ]);
    const prefix = `NL-${groupCode}-`;
    const existingMaximum = ingredients.docs.reduce((maximum, item) => {
      const current = String(item.data().code ?? "");
      if (!current.startsWith(prefix)) return maximum;
      const sequence = Number(current.slice(prefix.length));
      return Number.isSafeInteger(sequence) ? Math.max(maximum, sequence) : maximum;
    }, 0);
    const storedSequence = Number(counter.data()?.nextSequence ?? 1);
    const sequence = Math.max(existingMaximum + 1, storedSequence);
    code = formatIngredientCode(groupCode, sequence);

    transaction.set(counterRef, {
      nextSequence: sequence + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.create(ingredientRef, {
      ...input,
      groupCode,
      code,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { id: ingredientRef.id, ...input, groupCode, code, updatedAt: new Date() };
}

export async function recordIngredientCost(input: {
  ingredientId: string;
  costPerBaseUnitMicros: number;
  effectiveFrom: Date;
  source?: string;
  createdBy: string;
}) {
  const batch = db().batch();
  const ingredientRef = db().collection(INGREDIENTS_COLLECTION).doc(input.ingredientId);
  const costRef = db().collection(INGREDIENT_COSTS_COLLECTION).doc();
  batch.update(ingredientRef, {
    costPerBaseUnitMicros: input.costPerBaseUnitMicros,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(costRef, {
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { id: costRef.id, ...input, createdAt: new Date() };
}

export async function createRecipeVersion(
  input: Omit<RecipeVersion, "id" | "createdAt" | "updatedAt">,
) {
  const reference = db().collection(RECIPES_COLLECTION).doc();
  let version = 1;
  await db().runTransaction(async (transaction) => {
    const existing = await transaction.get(
      db().collection(RECIPES_COLLECTION).where("productId", "==", input.productId),
    );
    version = Math.max(0, ...existing.docs.map((item) => Number(item.data().version ?? 0))) + 1;
    transaction.create(reference, {
      ...input,
      version,
      status: "draft",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ...input, id: reference.id, version, status: "draft" as const, createdAt: new Date(), updatedAt: new Date() };
}

export async function activateRecipeVersion(recipeId: string) {
  const target = await db().collection(RECIPES_COLLECTION).doc(recipeId).get();
  if (!target.exists) throw new Error("RECIPE_NOT_FOUND");
  const productId = String(target.data()?.productId ?? "");
  const recipes = await db().collection(RECIPES_COLLECTION).where("productId", "==", productId).get();
  const batch = db().batch();
  recipes.docs.forEach((recipe) => batch.update(recipe.ref, {
    status: recipe.id === recipeId ? "active" : "retired",
    updatedAt: FieldValue.serverTimestamp(),
  }));
  await batch.commit();
}
