import {
  addDoc, collection, doc, getDoc, getDocs, query, runTransaction,
  serverTimestamp, setDoc, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import type { FinanceIngredient, IngredientBaseUnit, RecipeVersion } from "@/types";
import { formatIngredientCode, normalizeIngredientGroup } from "../domain/ingredient-code";

const INGREDIENTS_COLLECTION = "finance_ingredients";
const RECIPES_COLLECTION = "finance_recipe_versions";
const INGREDIENT_COSTS_COLLECTION = "finance_ingredient_cost_versions";
const INGREDIENT_CODES_COLLECTION = "finance_ingredient_codes";
const COUNTERS_COLLECTION = "finance_counters";
const OPERATION_KEYS_COLLECTION = "finance_operation_keys";
const AUDIT_COLLECTION = "finance_audit_log";

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
    groupCode: typeof data.groupCode === "string" ? data.groupCode : undefined,
    baseUnit: data.baseUnit as IngredientBaseUnit,
    costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
    isActive: data.isActive !== false,
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
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

export async function getFinanceIngredientById(ingredientId: string) {
  const snapshot = await getDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId));
  return snapshot.exists() ? mapIngredient(snapshot.id, snapshot.data()) : null;
}

export async function upsertFinanceIngredientProjection(input: {
  productId: string;
  code: string;
  name: string;
  groupCode: string;
  baseUnit: IngredientBaseUnit;
  purchasePackQuantity: number;
  referencePurchasePrice: number;
  isActive: boolean;
}) {
  const reference = doc(db, INGREDIENTS_COLLECTION, input.productId);
  const snapshot = await getDoc(reference);
  const costPerBaseUnitMicros = Math.round(
    (Math.max(0, input.referencePurchasePrice) /
      Math.max(0.000001, input.purchasePackQuantity)) *
      1_000_000,
  );
  const now = serverTimestamp();
  await setDoc(
    reference,
    {
      code: input.code,
      name: input.name,
      groupCode: normalizeIngredientGroup(input.groupCode),
      baseUnit: input.baseUnit,
      costPerBaseUnitMicros,
      isActive: input.isActive,
      ...(snapshot.exists() ? {} : { createdAt: now }),
      updatedAt: now,
    },
    { merge: true },
  );

  const previousCost = Number(snapshot.data()?.costPerBaseUnitMicros ?? -1);
  if (!snapshot.exists() || previousCost !== costPerBaseUnitMicros) {
    await addDoc(collection(db, INGREDIENT_COSTS_COLLECTION), {
      ingredientId: input.productId,
      costPerBaseUnitMicros,
      effectiveFrom: new Date(),
      source: "inventory_item",
      createdBy: "inventory",
      createdAt: serverTimestamp(),
    });
  }
  return getFinanceIngredientById(input.productId);
}

export async function getIngredientCostVersions(ingredientId: string) {
  const snapshot = await getDocs(query(
    collection(db, INGREDIENT_COSTS_COLLECTION),
    where("ingredientId", "==", ingredientId),
  ));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      ingredientId,
      costPerBaseUnitMicros: Number(data.costPerBaseUnitMicros ?? 0),
      effectiveFrom: toDate(data.effectiveFrom),
      source: typeof data.source === "string" ? data.source : undefined,
      createdBy: String(data.createdBy ?? ""),
      createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    };
  }).sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime());
}

export async function getActiveRecipeVersions() {
  const snapshot = await getDocs(query(collection(db, RECIPES_COLLECTION), where("status", "==", "active")));
  return snapshot.docs.map((item) => mapRecipe(item.id, item.data()));
}

export async function getAllRecipeVersions() {
  const snapshot = await getDocs(collection(db, RECIPES_COLLECTION));
  return snapshot.docs.map((item) => mapRecipe(item.id, item.data()))
    .sort((left, right) => right.version - left.version);
}

export async function getRecipeVersionById(recipeId: string) {
  const snapshot = await getDocs(collection(db, RECIPES_COLLECTION));
  const recipe = snapshot.docs.find((item) => item.id === recipeId);
  return recipe ? mapRecipe(recipe.id, recipe.data()) : null;
}

export async function createFinanceIngredient(
  input: Omit<FinanceIngredient, "id" | "updatedAt" | "code"> & { groupCode: string },
  context: { idempotencyKey: string; actor: string },
) {
  const groupCode = normalizeIngredientGroup(input.groupCode);
  const operationRef = doc(
    db,
    OPERATION_KEYS_COLLECTION,
    encodeURIComponent(`ingredient:create:${context.idempotencyKey}`),
  );
  const replayOperation = await getDoc(operationRef);
  if (replayOperation.exists()) {
    const replay = await getFinanceIngredientById(
      String(replayOperation.data().entityId ?? ""),
    );
    if (!replay) throw new Error("IDEMPOTENCY_RECORD_CORRUPT");
    return replay;
  }
  const ingredients = await getDocs(collection(db, INGREDIENTS_COLLECTION));
  const prefix = `NL-${groupCode}-`;
  const existingMaximum = ingredients.docs.reduce((maximum, item) => {
    const current = String(item.data().code ?? "");
    if (!current.startsWith(prefix)) return maximum;
    const sequence = Number(current.slice(prefix.length));
    return Number.isSafeInteger(sequence) ? Math.max(maximum, sequence) : maximum;
  }, 0);
  const reference = doc(collection(db, INGREDIENTS_COLLECTION));
  const costRef = doc(collection(db, INGREDIENT_COSTS_COLLECTION));
  const auditRef = doc(collection(db, AUDIT_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, `ingredient_code_${groupCode}`);

  return runTransaction(db, async (transaction) => {
    const operation = await transaction.get(operationRef);
    if (operation.exists()) {
      const replayRef = doc(
        db,
        INGREDIENTS_COLLECTION,
        String(operation.data().entityId ?? ""),
      );
      const replay = await transaction.get(replayRef);
      if (!replay.exists()) throw new Error("IDEMPOTENCY_RECORD_CORRUPT");
      return mapIngredient(replay.id, replay.data());
    }
    const counter = await transaction.get(counterRef);
    const storedSequence = Number(counter.data()?.nextSequence ?? 1);
    const sequence = Math.max(existingMaximum + 1, storedSequence);
    const code = formatIngredientCode(groupCode, sequence);
    const codeRef = doc(db, INGREDIENT_CODES_COLLECTION, encodeURIComponent(code));
    const codeReservation = await transaction.get(codeRef);
    if (codeReservation.exists()) throw new Error("INGREDIENT_CODE_EXISTS");

    transaction.set(counterRef, {
      nextSequence: sequence + 1,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(reference, {
      ...input,
      groupCode,
      code,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(codeRef, {
      ingredientId: reference.id,
      code,
      createdAt: serverTimestamp(),
    });
    transaction.set(costRef, {
      ingredientId: reference.id,
      costPerBaseUnitMicros: input.costPerBaseUnitMicros,
      effectiveFrom: new Date(),
      source: "initial",
      createdBy: context.actor,
      createdAt: serverTimestamp(),
    });
    transaction.set(operationRef, {
      entityType: "ingredient",
      entityId: reference.id,
      createdAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "ingredient_created",
      entityType: "ingredient",
      entityId: reference.id,
      actor: context.actor,
      metadata: { code },
      createdAt: serverTimestamp(),
    });
    return {
      id: reference.id,
      ...input,
      groupCode,
      code,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function updateFinanceIngredient(
  ingredientId: string,
  patch: { name?: string; isActive?: boolean },
  actor: string,
) {
  const reference = doc(db, INGREDIENTS_COLLECTION, ingredientId);
  const auditRef = doc(collection(db, AUDIT_COLLECTION));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("INGREDIENT_NOT_FOUND");
    const update = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      updatedAt: serverTimestamp(),
    };
    transaction.update(reference, update);
    transaction.set(auditRef, {
      action: patch.isActive === false ? "ingredient_deactivated" : "ingredient_updated",
      entityType: "ingredient",
      entityId: ingredientId,
      actor,
      metadata: patch,
      createdAt: serverTimestamp(),
    });
    return mapIngredient(ingredientId, {
      ...snapshot.data(),
      ...patch,
      updatedAt: new Date(),
    });
  });
}

export async function recordIngredientCost(input: {
  ingredientId: string;
  costPerBaseUnitMicros: number;
  effectiveFrom: Date;
  source?: string;
  createdBy: string;
}) {
  const ingredientRef = doc(db, INGREDIENTS_COLLECTION, input.ingredientId);
  const costRef = doc(collection(db, INGREDIENT_COSTS_COLLECTION));
  const auditRef = doc(collection(db, AUDIT_COLLECTION));
  return runTransaction(db, async (transaction) => {
    const ingredient = await transaction.get(ingredientRef);
    if (!ingredient.exists()) throw new Error("INGREDIENT_NOT_FOUND");
    transaction.update(ingredientRef, {
      costPerBaseUnitMicros: input.costPerBaseUnitMicros,
      updatedAt: serverTimestamp(),
    });
    transaction.set(costRef, {
      ingredientId: input.ingredientId,
      costPerBaseUnitMicros: input.costPerBaseUnitMicros,
      effectiveFrom: input.effectiveFrom,
      createdBy: input.createdBy,
      ...(input.source ? { source: input.source } : {}),
      createdAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "ingredient_cost_changed",
      entityType: "ingredient",
      entityId: input.ingredientId,
      actor: input.createdBy,
      metadata: {
        costPerBaseUnitMicros: input.costPerBaseUnitMicros,
        source: input.source ?? null,
      },
      createdAt: serverTimestamp(),
    });
    return { id: costRef.id, ...input, createdAt: new Date() };
  });
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
