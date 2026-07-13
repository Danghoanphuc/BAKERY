import type { IngredientBaseUnit } from "@/types";

export type PurchaseUnit = IngredientBaseUnit | "kilogram" | "litre";

const conversion: Record<PurchaseUnit, { baseUnit: IngredientBaseUnit; factor: number }> = {
  gram: { baseUnit: "gram", factor: 1 },
  kilogram: { baseUnit: "gram", factor: 1_000 },
  millilitre: { baseUnit: "millilitre", factor: 1 },
  litre: { baseUnit: "millilitre", factor: 1_000 },
  each: { baseUnit: "each", factor: 1 },
};

export function convertToBaseQuantity(quantity: number, unit: PurchaseUnit) {
  const definition = conversion[unit];
  const value = quantity * definition.factor;
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("INVALID_PURCHASE_QUANTITY");
  return { value, unit: definition.baseUnit } as const;
}

export function calculateCostPerBaseUnitMicros(input: {
  purchaseAmount: number;
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
}) {
  if (!Number.isSafeInteger(input.purchaseAmount) || input.purchaseAmount < 0) {
    throw new Error("INVALID_PURCHASE_AMOUNT");
  }
  const base = convertToBaseQuantity(input.purchaseQuantity, input.purchaseUnit);
  const micros = Math.round(input.purchaseAmount * 1_000_000 / base.value);
  if (!Number.isSafeInteger(micros)) throw new Error("COST_OVERFLOW");
  return { costPerBaseUnitMicros: micros, baseUnit: base.unit };
}

