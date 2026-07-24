import type { FinanceIngredient, Product, RecipeVersion } from "@/types";
import { normalizeIngredientGroup } from "../domain/ingredient-code";
import {
  activateRecipeVersion as persistRecipeActivation,
  createFinanceIngredient, createRecipeVersion,
  getActiveRecipeVersions, getAllRecipeVersions, getFinanceIngredients, getRecipeVersionById,
  recordIngredientCost,
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

export async function addIngredient(input: Omit<FinanceIngredient, "id" | "updatedAt" | "code"> & { groupCode?: string }) {
  if (!input.name.trim() || !baseUnits.has(input.baseUnit) ||
      !Number.isSafeInteger(input.costPerBaseUnitMicros) || input.costPerBaseUnitMicros < 0) {
    throw new Error("INVALID_INGREDIENT");
  }
  const ingredient = await createFinanceIngredient({
    ...input,
    groupCode: normalizeIngredientGroup(input.groupCode),
  });
  await recordIngredientCost({
    ingredientId: ingredient.id,
    costPerBaseUnitMicros: ingredient.costPerBaseUnitMicros,
    effectiveFrom: new Date(),
    source: "initial",
    createdBy: "admin",
  });
  await financeRepository.record({
    action: "ingredient_created", entityType: "ingredient",
    entityId: ingredient.id, actor: "admin", metadata: { code: ingredient.code },
  });
  return ingredient;
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
  await financeRepository.record({
    action: "ingredient_cost_changed", entityType: "ingredient",
    entityId: input.ingredientId, actor: input.actor,
    metadata: { costPerBaseUnitMicros: input.costPerBaseUnitMicros, source: input.source },
  });
  return cost;
}

export async function addRecipeVersion(
  input: Omit<RecipeVersion, "id" | "version" | "status" | "createdAt" | "updatedAt">,
) {
  const integerFields = [input.yieldQuantity, input.packagingCostPerBatch,
    input.directLaborCostPerBatch, input.overheadCostPerBatch, input.wasteBasisPoints];
  if (!input.productId || integerFields.some((value) => !Number.isSafeInteger(value) || value < 0) ||
      input.yieldQuantity === 0 || input.ingredients.some((line) =>
        !line.ingredientId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0)) {
    throw new Error("INVALID_RECIPE");
  }
  const availableIngredients = new Set(
    (await getFinanceIngredients()).filter((item) => item.isActive).map((item) => item.id),
  );
  if (input.ingredients.some((line) => !availableIngredients.has(line.ingredientId))) {
    throw new Error("INVALID_RECIPE");
  }
  const recipe = await createRecipeVersion({ ...input, version: 0, status: "draft" });
  await financeRepository.record({
    action: "recipe_version_created", entityType: "recipe",
    entityId: recipe.id, actor: "admin",
    metadata: { productId: recipe.productId, version: recipe.version },
  });
  return recipe;
}

export async function activateRecipe(recipeId: string) {
  const [recipe, ingredients] = await Promise.all([
    getRecipeVersionById(recipeId), getFinanceIngredients(),
  ]);
  if (!recipe) throw new Error("RECIPE_NOT_FOUND");
  calculateRecipeStandardUnitCost(recipe, new Map(ingredients.map((item) => [item.id, item])));
  await persistRecipeActivation(recipeId);
  await financeRepository.record({
    action: "recipe_version_activated", entityType: "recipe",
    entityId: recipeId, actor: "admin",
    metadata: { productId: recipe.productId, version: recipe.version },
  });
}
