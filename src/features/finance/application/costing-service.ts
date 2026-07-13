import type { FinanceIngredient, RecipeVersion } from "@/types";
import {
  activateRecipeVersion as persistRecipeActivation,
  createFinanceIngredient, createRecipeVersion,
  getActiveRecipeVersions, getFinanceIngredients, getRecipeVersionById,
  recordIngredientCost,
} from "../infrastructure/firestore-costing-repository";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import { calculateRecipeStandardUnitCost } from "../domain/standard-costing";

const baseUnits = new Set(["gram", "millilitre", "each"]);

export async function getStandardCostCatalog() {
  const [ingredients, recipes] = await Promise.all([
    getFinanceIngredients(), getActiveRecipeVersions(),
  ]);
  return { ingredients, recipes };
}

export async function addIngredient(input: Omit<FinanceIngredient, "id" | "updatedAt">) {
  if (!input.code.trim() || !input.name.trim() || !baseUnits.has(input.baseUnit) ||
      !Number.isSafeInteger(input.costPerBaseUnitMicros) || input.costPerBaseUnitMicros < 0) {
    throw new Error("INVALID_INGREDIENT");
  }
  const ingredient = await createFinanceIngredient(input);
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
