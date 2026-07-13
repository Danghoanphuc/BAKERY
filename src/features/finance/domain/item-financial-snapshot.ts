import type {
  CartItem, FinanceIngredient, OrderItemFinancialSnapshot, Product, RecipeVersion,
} from "@/types";
import { calculateLegacyStandardUnitCost, calculateRecipeStandardUnitCost } from "./standard-costing";
import { allocateIntegerByWeight } from "./proportional-allocation";

export function allocateDiscountByLargestRemainder(
  grossAmounts: number[],
  discountAmount: number,
) {
  const total = grossAmounts.reduce((sum, amount) => sum + amount, 0);
  const safeDiscount = Math.min(Math.max(0, discountAmount), total);
  return allocateIntegerByWeight(grossAmounts, safeDiscount);
}

export function buildItemFinancialSnapshots(input: {
  items: Array<CartItem | Omit<CartItem, "cartItemId">>;
  discountAmount: number;
  products: Product[];
  recipes: RecipeVersion[];
  ingredients: FinanceIngredient[];
  costingAt?: Date;
}): OrderItemFinancialSnapshot[] {
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const ingredientsById = new Map(input.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const costingAt = input.costingAt ?? new Date();
  const recipesByProductId = new Map(
    input.recipes.filter((recipe) =>
      recipe.status === "active" && new Date(recipe.effectiveFrom).getTime() <= costingAt.getTime())
      .sort((left, right) => left.version - right.version)
      .map((recipe) => [recipe.productId, recipe]),
  );
  const grossAmounts = input.items.map((item) => item.price * item.quantity);
  const discounts = allocateDiscountByLargestRemainder(grossAmounts, input.discountAmount);

  return input.items.map((item, index) => {
    const recipe = recipesByProductId.get(item.productId);
    const cost = recipe
      ? calculateRecipeStandardUnitCost(recipe, ingredientsById)
      : calculateLegacyStandardUnitCost(productsById.get(item.productId));
    const totalCost = cost.totalCost * item.quantity;
    const netRevenue = grossAmounts[index] - discounts[index];
    return {
      orderItemId: "cartItemId" in item && item.cartItemId
        ? item.cartItemId
        : `${item.productId}:${index}`,
      productId: item.productId, productName: item.productName, quantity: item.quantity,
      grossRevenue: grossAmounts[index], allocatedDiscount: discounts[index], netRevenue,
      ingredientCost: cost.ingredientCost * item.quantity,
      packagingCost: cost.packagingCost * item.quantity,
      directLaborCost: cost.directLaborCost * item.quantity,
      overheadCost: cost.overheadCost * item.quantity,
      wasteCost: cost.wasteCost * item.quantity,
      unitCost: cost.totalCost, totalCost, grossProfit: netRevenue - totalCost,
      costingSource: cost.source, recipeVersionId: cost.recipeVersionId,
      costingVersion: cost.costingVersion,
    };
  });
}
