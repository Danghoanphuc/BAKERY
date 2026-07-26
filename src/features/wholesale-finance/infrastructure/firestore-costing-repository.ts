import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { FinanceIngredient, IngredientBaseUnit, RecipeVersion } from "@/types";
import { formatIngredientCode, normalizeIngredientGroup } from "../domain/ingredient-code";

const INGREDIENTS_COLLECTION = "finance_ingredients";
const RECIPES_COLLECTION = "finance_recipe_versions";
const INGREDIENT_COSTS_COLLECTION = "finance_ingredient_cost_versions";
const COUNTERS_COLLECTION = "finance_counters";
const OPERATION_KEYS_COLLECTION = "finance_operation_keys";
const AUDIT_COLLECTION = "finance_audit_log";

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

export async function getFinanceIngredientById(ingredientId: string) {
  const snapshot = await db().collection(INGREDIENTS_COLLECTION).doc(ingredientId).get();
  return snapshot.exists ? mapIngredient(snapshot.id, snapshot.data() ?? {}) : null;
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
  const reference = db().collection(INGREDIENTS_COLLECTION).doc(input.productId);
  const snapshot = await reference.get();
  const costPerBaseUnitMicros = Math.round(
    (Math.max(0, input.referencePurchasePrice) /
      Math.max(0.000001, input.purchasePackQuantity)) *
      1_000_000,
  );
  const batch = db().batch();
  batch.set(
    reference,
    {
      code: input.code,
      name: input.name,
      groupCode: normalizeIngredientGroup(input.groupCode),
      baseUnit: input.baseUnit,
      costPerBaseUnitMicros,
      isActive: input.isActive,
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const previousCost = Number(snapshot.data()?.costPerBaseUnitMicros ?? -1);
  if (!snapshot.exists || previousCost !== costPerBaseUnitMicros) {
    batch.create(db().collection(INGREDIENT_COSTS_COLLECTION).doc(), {
      ingredientId: input.productId,
      costPerBaseUnitMicros,
      effectiveFrom: new Date(),
      source: "inventory_item",
      createdBy: "inventory",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return getFinanceIngredientById(input.productId);
}

export async function getIngredientCostVersions(ingredientId: string) {
  const snapshot = await db().collection(INGREDIENT_COSTS_COLLECTION)
    .where("ingredientId", "==", ingredientId)
    .get();
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
  context: { idempotencyKey: string; actor: string },
) {
  const groupCode = normalizeIngredientGroup(input.groupCode);
  const operationRef = db().collection(OPERATION_KEYS_COLLECTION)
    .doc(encodeURIComponent(`ingredient:create:${context.idempotencyKey}`));
  const replayOperation = await operationRef.get();
  if (replayOperation.exists) {
    const replay = await db().collection(INGREDIENTS_COLLECTION)
      .doc(String(replayOperation.data()?.entityId ?? ""))
      .get();
    if (!replay.exists) throw new Error("IDEMPOTENCY_RECORD_CORRUPT");
    return mapIngredient(replay.id, replay.data() ?? {});
  }
  const ingredientRef = db().collection(INGREDIENTS_COLLECTION).doc();
  return db().runTransaction(async (transaction) => {
    const operation = await transaction.get(operationRef);
    if (operation.exists) {
      const replay = await transaction.get(
        db().collection(INGREDIENTS_COLLECTION).doc(String(operation.data()?.entityId ?? "")),
      );
      if (!replay.exists) throw new Error("IDEMPOTENCY_RECORD_CORRUPT");
      return mapIngredient(replay.id, replay.data() ?? {});
    }
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
    const code = formatIngredientCode(groupCode, sequence);
    const costRef = db().collection(INGREDIENT_COSTS_COLLECTION).doc();
    const auditRef = db().collection(AUDIT_COLLECTION).doc();

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
    transaction.create(costRef, {
      ingredientId: ingredientRef.id,
      costPerBaseUnitMicros: input.costPerBaseUnitMicros,
      effectiveFrom: new Date(),
      source: "initial",
      createdBy: context.actor,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(operationRef, {
      entityType: "ingredient",
      entityId: ingredientRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      action: "ingredient_created",
      entityType: "ingredient",
      entityId: ingredientRef.id,
      actor: context.actor,
      metadata: { code },
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      id: ingredientRef.id,
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
  const reference = db().collection(INGREDIENTS_COLLECTION).doc(ingredientId);
  return db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new Error("INGREDIENT_NOT_FOUND");
    transaction.update(reference, {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const auditRef = db().collection(AUDIT_COLLECTION).doc();
    transaction.create(auditRef, {
      action: patch.isActive === false ? "ingredient_deactivated" : "ingredient_updated",
      entityType: "ingredient",
      entityId: ingredientId,
      actor,
      metadata: patch,
      createdAt: FieldValue.serverTimestamp(),
    });
    return mapIngredient(ingredientId, {
      ...(snapshot.data() ?? {}),
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
  const ingredientRef = db().collection(INGREDIENTS_COLLECTION).doc(input.ingredientId);
  const costRef = db().collection(INGREDIENT_COSTS_COLLECTION).doc();
  return db().runTransaction(async (transaction) => {
    const ingredient = await transaction.get(ingredientRef);
    if (!ingredient.exists) throw new Error("INGREDIENT_NOT_FOUND");
    transaction.update(ingredientRef, {
      costPerBaseUnitMicros: input.costPerBaseUnitMicros,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(costRef, {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(db().collection(AUDIT_COLLECTION).doc(), {
      action: "ingredient_cost_changed",
      entityType: "ingredient",
      entityId: input.ingredientId,
      actor: input.createdBy,
      metadata: {
        costPerBaseUnitMicros: input.costPerBaseUnitMicros,
        source: input.source ?? null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: costRef.id, ...input, createdAt: new Date() };
  });
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
