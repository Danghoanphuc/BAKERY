import type { FinanceIngredient, Product, RecipeVersion } from "@/types";
import { normalizeIngredientGroup } from "../domain/ingredient-code";
import {
  activateRecipeVersion as persistRecipeActivation,
  createFinanceIngredient, createRecipeVersion,
  getActiveRecipeVersions, getAllRecipeVersions, getFinanceIngredientById,
  getFinanceIngredients, getIngredientCostVersions, getRecipeVersionById,
  recordIngredientCost, updateFinanceIngredient,
} from "../infrastructure/firestore-costing-repository";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import {
  calculateLegacyStandardUnitCost,
  calculateRecipeStandardUnitCost,
  type StandardUnitCost,
} from "../domain/standard-costing";

const baseUnits = new Set(["gram", "millilitre", "each"]);

export type ProductCostLineSummary = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  baseUnit: FinanceIngredient["baseUnit"];
};

export type ProductCostSummary = {
  productId: string;
  source: StandardUnitCost["source"];
  totalCost: number;
  unitCost: StandardUnitCost;
  recipe?: {
    id: string;
    version: number;
    yieldQuantity: number;
    wasteBasisPoints: number;
    lines: ProductCostLineSummary[];
  };
};

export async function getStandardCostCatalog() {
  const [ingredients, recipes] = await Promise.all([
    getFinanceIngredients(), getActiveRecipeVersions(),
  ]);
  return { ingredients, recipes };
}

export async function getCostingWorkspace() {
  const [ingredients, recipes] = await Promise.all([
    getFinanceIngredients(), getAllRecipeVersions(),
  ]);
  return { ingredients, recipes };
}

export async function buildProductCostSummaries(
  products: Product[],
): Promise<Record<string, ProductCostSummary>> {
  const { ingredients, recipes } = await getStandardCostCatalog();
  const ingredientsById = new Map(ingredients.map((item) => [item.id, item]));
  const activeRecipeByProductId = new Map(
    recipes.map((recipe) => [recipe.productId, recipe]),
  );

  const summaries: Record<string, ProductCostSummary> = {};
  for (const product of products) {
    summaries[product.id] = summarizeProductCost(
      product,
      activeRecipeByProductId.get(product.id),
      ingredientsById,
    );
  }
  return summaries;
}

export function summarizeProductCost(
  product: Product,
  recipe: RecipeVersion | undefined,
  ingredientsById: ReadonlyMap<string, FinanceIngredient>,
): ProductCostSummary {
  if (recipe) {
    try {
      const unitCost = calculateRecipeStandardUnitCost(recipe, ingredientsById);
      return {
        productId: product.id,
        source: "recipe",
        totalCost: unitCost.totalCost,
        unitCost,
        recipe: {
          id: recipe.id,
          version: recipe.version,
          yieldQuantity: recipe.yieldQuantity,
          wasteBasisPoints: recipe.wasteBasisPoints,
          lines: recipe.ingredients.map((line) => {
            const ingredient = ingredientsById.get(line.ingredientId);
            return {
              ingredientId: line.ingredientId,
              ingredientName: ingredient?.name ?? line.ingredientId,
              quantity: line.quantity,
              baseUnit: ingredient?.baseUnit ?? "each",
            };
          }),
        },
      };
    } catch {
      // Fall through to legacy when active BOM cannot be priced.
    }
  }

  const unitCost = calculateLegacyStandardUnitCost(product);
  return {
    productId: product.id,
    source: unitCost.source,
    totalCost: unitCost.totalCost,
    unitCost,
  };
}

export async function addIngredient(
  input: Omit<FinanceIngredient, "id" | "createdAt" | "updatedAt" | "code"> & {
    groupCode?: string;
    idempotencyKey?: string;
  },
  actor = "admin",
) {
  if (typeof input.name !== "string" || !input.name.trim() || !baseUnits.has(input.baseUnit) ||
      !Number.isSafeInteger(input.costPerBaseUnitMicros) || input.costPerBaseUnitMicros < 0) {
    throw new Error("INVALID_INGREDIENT");
  }
  const idempotencyKey = input.idempotencyKey?.trim() || crypto.randomUUID();
  if (idempotencyKey.length > 120) throw new Error("INVALID_INGREDIENT");
  return createFinanceIngredient({
    name: input.name.trim(),
    baseUnit: input.baseUnit,
    costPerBaseUnitMicros: input.costPerBaseUnitMicros,
    isActive: input.isActive !== false,
    groupCode: normalizeIngredientGroup(input.groupCode),
  }, {
    idempotencyKey,
    actor,
  });
}

export async function getIngredient(ingredientId: string) {
  if (!ingredientId) throw new Error("INGREDIENT_NOT_FOUND");
  return getFinanceIngredientById(ingredientId);
}

export async function getIngredientCosts(ingredientId: string) {
  const ingredient = await getFinanceIngredientById(ingredientId);
  if (!ingredient) throw new Error("INGREDIENT_NOT_FOUND");
  return getIngredientCostVersions(ingredientId);
}

export async function editIngredient(
  ingredientId: string,
  patch: { name?: unknown; isActive?: unknown; code?: unknown; baseUnit?: unknown; groupCode?: unknown },
  actor: string,
) {
  const current = await getFinanceIngredientById(ingredientId);
  if (!current) throw new Error("INGREDIENT_NOT_FOUND");
  if ((patch.code !== undefined && patch.code !== current.code) ||
      (patch.baseUnit !== undefined && patch.baseUnit !== current.baseUnit) ||
      (patch.groupCode !== undefined && patch.groupCode !== current.groupCode)) {
    throw new Error("IMMUTABLE_INGREDIENT_FIELD");
  }
  const name = patch.name === undefined ? undefined : String(patch.name).trim();
  if (name !== undefined && !name) throw new Error("INVALID_INGREDIENT");
  const isActive = patch.isActive === undefined ? undefined : patch.isActive;
  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new Error("INVALID_INGREDIENT");
  }
  if (isActive === false && current.isActive) {
    const activeRecipes = await getActiveRecipeVersions();
    if (activeRecipes.some((recipe) =>
      recipe.ingredients.some((line) => line.ingredientId === ingredientId))) {
      throw new Error("INGREDIENT_IN_ACTIVE_RECIPE");
    }
  }
  return updateFinanceIngredient(ingredientId, { name, isActive }, actor);
}

export function deactivateIngredient(ingredientId: string, actor: string) {
  return editIngredient(ingredientId, { isActive: false }, actor);
}

export async function changeIngredientCost(input: {
  ingredientId: string;
  costPerBaseUnitMicros: number;
  effectiveFrom: Date;
  source?: string;
  actor: string;
}) {
  if (!input.ingredientId || !Number.isSafeInteger(input.costPerBaseUnitMicros) ||
      input.costPerBaseUnitMicros < 0 || Number.isNaN(new Date(input.effectiveFrom).getTime()) ||
      new Date(input.effectiveFrom).getTime() > Date.now()) {
    throw new Error("INVALID_INGREDIENT_COST");
  }
  const cost = await recordIngredientCost({
    ingredientId: input.ingredientId,
    costPerBaseUnitMicros: input.costPerBaseUnitMicros,
    effectiveFrom: new Date(input.effectiveFrom),
    source: input.source,
    createdBy: input.actor,
  });
  return cost;
}

export async function addRecipeVersion(
  input: Omit<RecipeVersion, "id" | "version" | "status" | "createdAt" | "updatedAt">,
  actor = "admin",
) {
  const integerFields = [input.yieldQuantity, input.packagingCostPerBatch,
    input.directLaborCostPerBatch, input.overheadCostPerBatch, input.wasteBasisPoints];
  const effectiveFrom = new Date(input.effectiveFrom);
  const ingredientIds = input.ingredients.map((line) => line.ingredientId);
  if (!input.productId || integerFields.some((value) => !Number.isSafeInteger(value) || value < 0) ||
      input.yieldQuantity === 0 || input.wasteBasisPoints > 10_000 ||
      Number.isNaN(effectiveFrom.getTime()) || input.ingredients.length === 0 ||
      new Set(ingredientIds).size !== ingredientIds.length || input.ingredients.some((line) =>
        !line.ingredientId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0)) {
    throw new Error("INVALID_RECIPE");
  }
  const availableIngredients = new Set(
    (await getFinanceIngredients()).filter((item) => item.isActive).map((item) => item.id),
  );
  if (input.ingredients.some((line) => !availableIngredients.has(line.ingredientId))) {
    throw new Error("INVALID_RECIPE");
  }
  const recipe = await createRecipeVersion({
    ...input,
    effectiveFrom,
    version: 0,
    status: "draft",
  });
  await financeRepository.record({
    action: "recipe_version_created", entityType: "recipe",
    entityId: recipe.id, actor,
    metadata: { productId: recipe.productId, version: recipe.version },
  });
  return recipe;
}

export async function activateRecipe(recipeId: string, actor = "admin") {
  const [recipe, ingredients] = await Promise.all([
    getRecipeVersionById(recipeId), getFinanceIngredients(),
  ]);
  if (!recipe) throw new Error("RECIPE_NOT_FOUND");
  if (new Date(recipe.effectiveFrom).getTime() > Date.now()) {
    throw new Error("RECIPE_NOT_EFFECTIVE");
  }
  calculateRecipeStandardUnitCost(recipe, new Map(ingredients.map((item) => [item.id, item])));
  await persistRecipeActivation(recipeId);
  await financeRepository.record({
    action: "recipe_version_activated", entityType: "recipe",
    entityId: recipeId, actor,
    metadata: { productId: recipe.productId, version: recipe.version },
  });
  return recipe;
}
