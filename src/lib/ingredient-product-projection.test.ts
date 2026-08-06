import { describe, expect, it } from "vitest";
import type { FinanceIngredient, Product } from "@/types";
import {
  financeIngredientToProduct,
  getMissingIngredientProducts,
  isCanonicalIngredientSku,
} from "./ingredient-product-projection";

const ingredient: FinanceIngredient = {
  id: "ingredient-1",
  code: "NL-BOT-01",
  groupCode: "BOT",
  name: "Bột mì",
  baseUnit: "gram",
  purchaseUnit: "bao",
  purchasePackQuantity: 40_000,
  referencePurchasePrice: 600_000,
  costPerBaseUnitMicros: 12_500_000,
  isActive: true,
};

describe("ingredient product projection", () => {
  it("keeps the finance ingredient id so BOM references remain valid", () => {
    const product = financeIngredientToProduct(ingredient);

    expect(product).toMatchObject({
      id: "ingredient-1",
      sku: "NL-BOT-01",
      name: "Bột mì",
      itemType: "ingredient",
      lifecycleStatus: "active",
      ingredientGroup: "BOT",
      baseUnit: "gram",
      purchaseUnit: "bao",
      purchasePackQuantity: 40_000,
      referencePurchasePrice: 600_000,
      price: 0,
      stock: 0,
      isAvailable: false,
    });
  });

  it("maps inactive ingredients and supplies a legacy group fallback", () => {
    expect(
      financeIngredientToProduct({
        ...ingredient,
        groupCode: undefined,
        isActive: false,
      }),
    ).toMatchObject({
      lifecycleStatus: "inactive",
      ingredientGroup: "OTHER",
    });
  });

  it("returns only finance ingredients without a product document", () => {
    const existing = [{ id: ingredient.id }] as Product[];
    const missing = {
      ...ingredient,
      id: "ingredient-2",
      code: "NL-BOT-02",
    };

    expect(
      getMissingIngredientProducts([ingredient, missing], existing).map(
        (product) => product.id,
      ),
    ).toEqual(["ingredient-2"]);
  });

  it("recognizes only ingredient SKUs produced by the current generator", () => {
    expect(isCanonicalIngredientSku("NL-BOTMI-01")).toBe(true);
    expect(isCanonicalIngredientSku("NL-DUNG11-101")).toBe(true);
    expect(isCanonicalIngredientSku("botmicake")).toBe(false);
    expect(isCanonicalIngredientSku("B-01")).toBe(false);
    expect(isCanonicalIngredientSku("NL-NAME-1")).toBe(false);
  });
});
