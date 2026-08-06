import type { FinanceIngredient, Product, RecipeVersion } from "@/types";

const MICROS_PER_VND = 1_000_000;

export type StandardUnitCost = {
  ingredientCost: number;
  packagingCost: number;
  directLaborCost: number;
  overheadCost: number;
  wasteCost: number;
  totalCost: number;
  source: "recipe" | "legacy" | "missing";
  recipeVersionId?: string;
  costingVersion: string;
};

export type RecipeCostDraft = Pick<
  RecipeVersion,
  | "yieldQuantity"
  | "ingredients"
  | "packagingCostPerBatch"
  | "directLaborCostPerBatch"
  | "overheadCostPerBatch"
  | "wasteBasisPoints"
>;

function assertNonNegativeSafeInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`INVALID_${field}`);
}

export function calculateRecipeStandardUnitCost(
  recipe: RecipeVersion,
  ingredientsById: ReadonlyMap<string, FinanceIngredient>,
  semiFinishedUnitCosts: ReadonlyMap<string, StandardUnitCost> = new Map(),
): StandardUnitCost {
  assertNonNegativeSafeInteger(recipe.yieldQuantity, "RECIPE_YIELD");
  if (recipe.yieldQuantity === 0) throw new Error("RECIPE_YIELD_MUST_BE_POSITIVE");
  assertNonNegativeSafeInteger(recipe.wasteBasisPoints, "WASTE_BASIS_POINTS");

  let ingredientCostMicros = 0;
  for (const line of recipe.ingredients) {
    assertNonNegativeSafeInteger(line.quantity, "INGREDIENT_QUANTITY");
    if (line.componentType === "semi_finished") {
      const componentCost = semiFinishedUnitCosts.get(line.ingredientId);
      if (!componentCost || componentCost.source !== "recipe") {
        throw new Error(`SEMI_FINISHED_COST_NOT_AVAILABLE:${line.ingredientId}`);
      }
      assertNonNegativeSafeInteger(componentCost.totalCost, "SEMI_FINISHED_UNIT_COST");
      ingredientCostMicros +=
        line.quantity * componentCost.totalCost * MICROS_PER_VND;
    } else {
      const ingredient = ingredientsById.get(line.ingredientId);
      if (!ingredient?.isActive) throw new Error(`INGREDIENT_NOT_AVAILABLE:${line.ingredientId}`);
      assertNonNegativeSafeInteger(ingredient.costPerBaseUnitMicros, "INGREDIENT_UNIT_COST");
      ingredientCostMicros += line.quantity * ingredient.costPerBaseUnitMicros;
    }
    if (!Number.isSafeInteger(ingredientCostMicros)) throw new Error("COST_OVERFLOW");
  }

  const ingredientBatchCost = ingredientCostMicros / MICROS_PER_VND;
  const directBatchCost = ingredientBatchCost + recipe.packagingCostPerBatch +
    recipe.directLaborCostPerBatch + recipe.overheadCostPerBatch;
  const wasteBatchCost = directBatchCost * recipe.wasteBasisPoints / 10_000;
  const perUnit = (value: number) => Math.round(value / recipe.yieldQuantity);

  const result = {
    ingredientCost: perUnit(ingredientBatchCost),
    packagingCost: perUnit(recipe.packagingCostPerBatch),
    directLaborCost: perUnit(recipe.directLaborCostPerBatch),
    overheadCost: perUnit(recipe.overheadCostPerBatch),
    wasteCost: perUnit(wasteBatchCost),
  };
  return {
    ...result,
    totalCost: Object.values(result).reduce((sum, amount) => sum + amount, 0),
    source: "recipe",
    recipeVersionId: recipe.id,
    costingVersion: `recipe:${recipe.id}:v${recipe.version}`,
  };
}

/**
 * Canonical client-side BOM preview. It deliberately delegates to the same
 * domain calculation used after a recipe is persisted, so create forms cannot
 * drift in rounding or waste treatment.
 */
export function calculateRecipeDraftStandardUnitCost(
  draft: RecipeCostDraft,
  components: readonly FinanceIngredient[],
): StandardUnitCost {
  const componentById = new Map(components.map((item) => [item.id, item]));
  const rawIngredients = new Map<string, FinanceIngredient>();
  const semiFinishedUnitCosts = new Map<string, StandardUnitCost>();

  for (const line of draft.ingredients) {
    const component = componentById.get(line.ingredientId);
    if (!component) continue;
    if (line.componentType === "semi_finished") {
      const totalCost = Math.round(component.costPerBaseUnitMicros / MICROS_PER_VND);
      semiFinishedUnitCosts.set(line.ingredientId, {
        ingredientCost: totalCost,
        packagingCost: 0,
        directLaborCost: 0,
        overheadCost: 0,
        wasteCost: 0,
        totalCost,
        source: "recipe",
        costingVersion: `preview:semi-finished:${line.ingredientId}`,
      });
    } else {
      rawIngredients.set(line.ingredientId, component);
    }
  }

  return calculateRecipeStandardUnitCost(
    {
      id: "preview",
      productId: "preview",
      version: 0,
      status: "draft",
      effectiveFrom: new Date(0),
      ...draft,
    },
    rawIngredients,
    semiFinishedUnitCosts,
  );
}

export function calculateRecipeStandardUnitCostGraph(
  recipe: RecipeVersion,
  ingredientsById: ReadonlyMap<string, FinanceIngredient>,
  activeRecipesByProductId: ReadonlyMap<string, RecipeVersion>,
  stack: readonly string[] = [],
): StandardUnitCost {
  if (stack.includes(recipe.productId)) {
    throw new Error(`RECIPE_COMPONENT_CYCLE:${[...stack, recipe.productId].join("->")}`);
  }
  const nextStack = [...stack, recipe.productId];
  const componentCosts = new Map<string, StandardUnitCost>();
  for (const line of recipe.ingredients) {
    if (line.componentType !== "semi_finished") continue;
    const componentRecipe = activeRecipesByProductId.get(line.ingredientId);
    if (!componentRecipe) {
      throw new Error(`SEMI_FINISHED_RECIPE_NOT_AVAILABLE:${line.ingredientId}`);
    }
    componentCosts.set(
      line.ingredientId,
      calculateRecipeStandardUnitCostGraph(
        componentRecipe,
        ingredientsById,
        activeRecipesByProductId,
        nextStack,
      ),
    );
  }
  return calculateRecipeStandardUnitCost(recipe, ingredientsById, componentCosts);
}

export function calculateLegacyStandardUnitCost(product?: Product): StandardUnitCost {
  if (!product) return {
    ingredientCost: 0, packagingCost: 0, directLaborCost: 0, overheadCost: 0,
    wasteCost: 0, totalCost: 0, source: "missing", costingVersion: "missing:v1",
  };
  const ingredientCost = product.ingredientsCost ?? 0;
  const packagingCost = product.packagingCost ?? 0;
  const directLaborCost = product.laborCost ?? 0;
  const overheadCost = product.overheadCost ?? 0;
  const base = ingredientCost + packagingCost + directLaborCost + overheadCost;
  const wasteCost = Math.round(base * Math.max(0, product.wastePercent ?? 0) / 100);
  return {
    ingredientCost, packagingCost, directLaborCost, overheadCost, wasteCost,
    totalCost: base + wasteCost, source: base > 0 ? "legacy" : "missing",
    costingVersion: `legacy:product:${product.id}:v1`,
  };
}

