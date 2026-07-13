import type {
  InventoryItemType, ProductionIngredientUsage, PurchaseReceiptLine, WasteReason,
} from "@/types";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import {
  getInventoryBalances, persistCompletedProductionBatch, persistProductSale,
  persistPurchaseReceipt, persistWaste,
} from "../infrastructure/firestore-operations-repository";
import { getRecipeVersionById } from "../infrastructure/firestore-costing-repository";

function positiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validDate(value: Date) {
  return !Number.isNaN(new Date(value).getTime());
}

const wasteReasons = new Set<WasteReason>([
  "expired", "production_defect", "damaged", "overproduction",
  "cancelled_order", "stocktake_variance", "internal_use", "sample",
]);

export async function receiveIngredientPurchase(input: {
  idempotencyKey: string; supplierId?: string; documentNumber?: string;
  locationId: string; lines: PurchaseReceiptLine[]; occurredAt: Date; actor: string;
}) {
  const uniqueIngredients = new Set(input.lines.map((line) => line.ingredientId));
  if (!input.idempotencyKey || !input.locationId || !validDate(input.occurredAt) || input.lines.length === 0 ||
      uniqueIngredients.size !== input.lines.length || input.lines.some((line) =>
        !line.ingredientId || !positiveInteger(line.quantity) || !nonNegativeInteger(line.lineAmount))) {
    throw new Error("INVALID_PURCHASE_RECEIPT");
  }
  const receipt = await persistPurchaseReceipt({
    ...input, occurredAt: new Date(input.occurredAt), createdBy: input.actor,
  });
  if (receipt) await financeRepository.record({
    action: "purchase_received", entityType: "purchase", entityId: receipt.id,
    actor: input.actor, metadata: { totalAmount: receipt.totalAmount, lineCount: receipt.lines.length },
  });
  return receipt;
}

export async function completeProductionBatch(input: {
  idempotencyKey: string; productId: string; recipeVersionId: string;
  locationId: string; plannedQuantity: number; actualGoodQuantity: number;
  damagedQuantity: number; ingredientUsages: ProductionIngredientUsage[];
  packagingCost: number; directLaborCost: number; overheadCost: number;
  occurredAt: Date; actor: string;
}) {
  const recipe = await getRecipeVersionById(input.recipeVersionId);
  const uniqueIngredients = new Set(input.ingredientUsages.map((usage) => usage.ingredientId));
  const allowedIngredients = new Set(recipe?.ingredients.map((line) => line.ingredientId));
  const costs = [input.packagingCost, input.directLaborCost, input.overheadCost, input.damagedQuantity];
  if (!recipe || recipe.productId !== input.productId || recipe.status !== "active" ||
      !input.idempotencyKey || !input.locationId || !validDate(input.occurredAt) || !positiveInteger(input.plannedQuantity) ||
      !positiveInteger(input.actualGoodQuantity) || costs.some((value) => !nonNegativeInteger(value)) ||
      uniqueIngredients.size !== input.ingredientUsages.length || input.ingredientUsages.length === 0 ||
      input.ingredientUsages.some((usage) =>
        !allowedIngredients.has(usage.ingredientId) || !positiveInteger(usage.actualQuantity))) {
    throw new Error("INVALID_PRODUCTION_BATCH");
  }
  const batch = await persistCompletedProductionBatch({
    ...input, occurredAt: new Date(input.occurredAt), createdBy: input.actor,
  });
  if (batch) await financeRepository.record({
    action: "production_batch_completed", entityType: "production_batch",
    entityId: batch.id, actor: input.actor,
    metadata: {
      productId: batch.productId, actualGoodQuantity: batch.actualGoodQuantity,
      damagedQuantity: batch.damagedQuantity, totalActualCost: batch.totalActualCost,
    },
  });
  return batch;
}

export async function recordInventoryWaste(input: {
  idempotencyKey: string; itemType: InventoryItemType; itemId: string;
  locationId: string; quantity: number; reason: WasteReason;
  occurredAt: Date; actor: string;
}) {
  if (!input.idempotencyKey || !input.itemId || !input.locationId ||
      !["ingredient", "product"].includes(input.itemType) || !positiveInteger(input.quantity)) {
    throw new Error("INVALID_WASTE_RECORD");
  }
  if (!validDate(input.occurredAt) || !wasteReasons.has(input.reason)) {
    throw new Error("INVALID_WASTE_RECORD");
  }
  const waste = await persistWaste({ ...input, createdBy: input.actor });
  if (waste) await financeRepository.record({
    action: "inventory_waste_recorded", entityType: "inventory_waste",
    entityId: waste.id, actor: input.actor,
    metadata: { itemType: input.itemType, itemId: input.itemId, quantity: input.quantity, reason: input.reason },
  });
  return waste;
}

export { getInventoryBalances };

export async function recordProductSaleInventory(input: {
  orderId: string; locationId?: string;
  items: Array<{ productId: string; quantity: number; unitStandardCost?: number }>;
  occurredAt?: Date; actor: string;
}) {
  const quantities = new Map<string, number>();
  const unitCosts = new Map<string, number>();
  for (const item of input.items) {
    if (!item.productId || !positiveInteger(item.quantity) ||
        (item.unitStandardCost !== undefined && !nonNegativeInteger(item.unitStandardCost))) {
      throw new Error("INVALID_SALE_INVENTORY");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    if (item.unitStandardCost !== undefined) unitCosts.set(item.productId, item.unitStandardCost);
  }
  return persistProductSale({
    idempotencyKey: `order:${input.orderId}:inventory-sale`,
    orderId: input.orderId,
    locationId: input.locationId ?? "main",
    items: [...quantities].map(([productId, quantity]) => ({
      productId, quantity, unitStandardCost: unitCosts.get(productId),
    })),
    occurredAt: input.occurredAt ?? new Date(),
    createdBy: input.actor,
  });
}
