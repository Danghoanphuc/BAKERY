import type { FinanceIngredient, Product } from "@/types";

const purchaseUnitByBaseUnit: Record<
  FinanceIngredient["baseUnit"],
  string
> = {
  gram: "g",
  millilitre: "ml",
  each: "cái",
};

export function financeIngredientToProduct(
  ingredient: FinanceIngredient,
): Product {
  const groupCode = ingredient.groupCode?.trim() || "OTHER";

  return {
    id: ingredient.id,
    name: ingredient.name,
    displayName: ingredient.name,
    itemType: "ingredient",
    lifecycleStatus: ingredient.isActive ? "active" : "inactive",
    ingredientGroup: groupCode,
    baseUnit: ingredient.baseUnit,
    purchaseUnit: purchaseUnitByBaseUnit[ingredient.baseUnit],
    purchasePackQuantity: 1,
    referencePurchasePrice: ingredient.costPerBaseUnitMicros / 1_000_000,
    minimumStock: 0,
    preferredSupplier: "",
    price: 0,
    imageUrl: "",
    description: "",
    sku: ingredient.code,
    stock: 0,
    isAvailable: false,
    availableForDelivery: false,
    availableForPickup: false,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  };
}

export function getMissingIngredientProducts(
  ingredients: FinanceIngredient[],
  products: Product[],
) {
  const productIds = new Set(products.map((product) => product.id));
  return ingredients
    .filter((ingredient) => !productIds.has(ingredient.id))
    .map(financeIngredientToProduct);
}

export function isCanonicalIngredientSku(value: string | undefined) {
  return /^NL-[A-Z0-9]{1,7}-\d{2,}$/.test(value?.trim().toUpperCase() ?? "");
}
