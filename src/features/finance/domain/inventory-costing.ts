import type { InventoryBalance, ProductionIngredientUsage } from "@/types";

export function calculateWeightedBalance(input: {
  currentQuantity: number;
  currentValue: number;
  receivedQuantity: number;
  receivedValue: number;
}) {
  for (const value of Object.values(input)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_INVENTORY_VALUE");
  }
  return {
    quantity: input.currentQuantity + input.receivedQuantity,
    inventoryValue: input.currentValue + input.receivedValue,
  };
}

export function consumeWeightedInventory(balance: InventoryBalance, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error("INVALID_ISSUE_QUANTITY");
  if (balance.quantity < quantity) throw new Error(`INSUFFICIENT_INVENTORY:${balance.itemId}`);
  const consumedValue = quantity === balance.quantity
    ? balance.inventoryValue
    : Math.round(balance.inventoryValue * quantity / balance.quantity);
  return {
    consumedValue,
    nextBalance: {
      ...balance,
      quantity: balance.quantity - quantity,
      inventoryValue: balance.inventoryValue - consumedValue,
    },
  };
}

export function calculateActualBatchCost(input: {
  usages: ProductionIngredientUsage[];
  ingredientCost: number;
  packagingCost: number;
  directLaborCost: number;
  overheadCost: number;
  actualGoodQuantity: number;
}) {
  if (!Number.isSafeInteger(input.actualGoodQuantity) || input.actualGoodQuantity <= 0) {
    throw new Error("ACTUAL_GOOD_QUANTITY_MUST_BE_POSITIVE");
  }
  const totalActualCost = input.ingredientCost + input.packagingCost +
    input.directLaborCost + input.overheadCost;
  if (!Number.isSafeInteger(totalActualCost) || totalActualCost < 0) throw new Error("INVALID_BATCH_COST");
  return { totalActualCost, actualUnitCost: Math.round(totalActualCost / input.actualGoodQuantity) };
}

