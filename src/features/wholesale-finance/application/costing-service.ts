import type { FinanceIngredient, Product, RecipeVersion } from "@/types";
import { normalizeIngredientGroup } from "../domain/ingredient-code";
import {
  activateRecipeVersion as persistRecipeActivation,
  createFinanceIngredient, createRecipeVersion,
  getActiveRecipeVersions, getAllRecipeVersions, getFinanceIngredientById,
  getCostingProducts, getFinanceIngredients, getIngredientCostVersions,
  getRecipeVersionById,
  recordIngredientCost, updateFinanceIngredient,
} from "../infrastructure/firestore-costing-repository";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import {
  calculateDirectLaborCost,
  calculatePackagingCost,
  calculateWasteBasisPoints,
} from "../domain/recipe-supplemental-costs";
import {
  calculateLegacyStandardUnitCost,
  calculateRecipeStandardUnitCost,
  calculateRecipeStandardUnitCostGraph,
  type StandardUnitCost,
} from "../domain/standard-costing";

const baseUnits = new Set(["gram", "millilitre", "each"]);

export type ProductCostLineSummary = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  baseUnit: FinanceIngredient["baseUnit"];
  componentType?: "ingredient" | "semi_finished";
  unitCost: number;
  lineCost: number;
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
  const productsById = new Map(products.map((item) => [item.id, item]));

  const summaries: Record<string, ProductCostSummary> = {};
  for (const product of products) {
    summaries[product.id] = summarizeProductCost(
      product,
      activeRecipeByProductId.get(product.id),
      ingredientsById,
      activeRecipeByProductId,
      productsById,
    );
  }
  return summaries;
}

export function summarizeProductCost(
  product: Product,
  recipe: RecipeVersion | undefined,
  ingredientsById: ReadonlyMap<string, FinanceIngredient>,
  activeRecipesByProductId?: ReadonlyMap<string, RecipeVersion>,
  productsById: ReadonlyMap<string, Product> = new Map(),
): ProductCostSummary {
  if (recipe) {
    try {
      const unitCost = activeRecipesByProductId
        ? calculateRecipeStandardUnitCostGraph(
            recipe,
            ingredientsById,
            activeRecipesByProductId,
          )
        : calculateRecipeStandardUnitCost(recipe, ingredientsById);
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
            const isSemiFinished = line.componentType === "semi_finished";
            const ingredient = isSemiFinished
              ? undefined
              : ingredientsById.get(line.ingredientId);
            const component = isSemiFinished
              ? productsById.get(line.ingredientId)
              : undefined;
            const componentRecipe = isSemiFinished
              ? activeRecipesByProductId?.get(line.ingredientId)
              : undefined;
            const componentUnitCost = isSemiFinished && componentRecipe && activeRecipesByProductId
              ? calculateRecipeStandardUnitCostGraph(
                  componentRecipe,
                  ingredientsById,
                  activeRecipesByProductId,
                ).totalCost
              : Number(ingredient?.costPerBaseUnitMicros ?? 0) / 1_000_000;
            return {
              ingredientId: line.ingredientId,
              ingredientName:
                component?.name ?? ingredient?.name ?? line.ingredientId,
              quantity: line.quantity,
              baseUnit: component?.baseUnit ?? ingredient?.baseUnit ?? "each",
              componentType: isSemiFinished
                ? "semi_finished"
                : "ingredient",
              unitCost: componentUnitCost,
              lineCost: line.quantity * componentUnitCost,
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
  const packagingLinesValid =
    !input.packagingCostLines ||
    (input.packagingCostLines.every(
      (line) =>
        Boolean(line.id) &&
        Boolean(line.name.trim()) &&
        Number.isFinite(line.quantity) &&
        line.quantity > 0 &&
        Number.isSafeInteger(line.unitCost) &&
        line.unitCost >= 0,
    ) &&
      calculatePackagingCost(input.packagingCostLines) ===
        input.packagingCostPerBatch);
  const laborLinesValid =
    !input.directLaborCostLines ||
    (input.directLaborCostLines.every(
      (line) =>
        Boolean(line.id) &&
        Boolean(line.role.trim()) &&
        Number.isFinite(line.people) &&
        line.people > 0 &&
        Number.isFinite(line.minutes) &&
        line.minutes > 0 &&
        Number.isSafeInteger(line.hourlyRate) &&
        line.hourlyRate >= 0,
    ) &&
      calculateDirectLaborCost(input.directLaborCostLines) ===
        input.directLaborCostPerBatch);
  const wasteCalculationValid =
    !input.wasteCalculation ||
    (Number.isFinite(input.wasteCalculation.plannedQuantity) &&
      input.wasteCalculation.plannedQuantity > 0 &&
      Number.isFinite(input.wasteCalculation.goodQuantity) &&
      input.wasteCalculation.goodQuantity >= 0 &&
      input.wasteCalculation.goodQuantity <=
        input.wasteCalculation.plannedQuantity &&
      calculateWasteBasisPoints(input.wasteCalculation) ===
        input.wasteBasisPoints);
  if (!input.productId || integerFields.some((value) => !Number.isSafeInteger(value) || value < 0) ||
      input.yieldQuantity === 0 || input.wasteBasisPoints > 10_000 ||
      Number.isNaN(effectiveFrom.getTime()) || input.ingredients.length === 0 ||
      new Set(ingredientIds).size !== ingredientIds.length || input.ingredients.some((line) =>
        !line.ingredientId ||
        !["ingredient", "semi_finished"].includes(
          line.componentType ?? "ingredient",
        ) ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0) ||
      !packagingLinesValid || !laborLinesValid || !wasteCalculationValid) {
    throw new Error("INVALID_RECIPE");
  }
  const [ingredients, products, activeRecipes] = await Promise.all([
    getFinanceIngredients(),
    getCostingProducts(),
    getActiveRecipeVersions(),
  ]);
  const availableIngredients = new Set(
    ingredients.filter((item) => item.isActive).map((item) => item.id),
  );
  const productsById = new Map(products.map((item) => [item.id, item]));
  const activeRecipeProductIds = new Set(
    activeRecipes.map((recipe) => recipe.productId),
  );
  if (input.ingredients.some((line) => {
    if (line.componentType === "semi_finished") {
      const component = productsById.get(line.ingredientId);
      return (
        line.ingredientId === input.productId ||
        component?.itemType !== "semi_finished" ||
        !activeRecipeProductIds.has(line.ingredientId)
      );
    }
    return !availableIngredients.has(line.ingredientId);
  })) {
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
  const [recipe, ingredients, recipes] = await Promise.all([
    getRecipeVersionById(recipeId),
    getFinanceIngredients(),
    getAllRecipeVersions(),
  ]);
  if (!recipe) throw new Error("RECIPE_NOT_FOUND");
  if (new Date(recipe.effectiveFrom).getTime() > Date.now()) {
    throw new Error("RECIPE_NOT_EFFECTIVE");
  }
  const activeRecipesByProductId = new Map(
    recipes
      .filter((item) => item.status === "active")
      .map((item) => [item.productId, item]),
  );
  activeRecipesByProductId.set(recipe.productId, recipe);
  calculateRecipeStandardUnitCostGraph(
    recipe,
    new Map(ingredients.map((item) => [item.id, item])),
    activeRecipesByProductId,
  );
  await persistRecipeActivation(recipeId);
  await financeRepository.record({
    action: "recipe_version_activated", entityType: "recipe",
    entityId: recipeId, actor,
    metadata: { productId: recipe.productId, version: recipe.version },
  });
  return recipe;
}
