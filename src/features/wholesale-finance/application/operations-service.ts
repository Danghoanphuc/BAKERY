import type {
  IngredientPurchaseUnit, InventoryItemType, ProductionIngredientUsage,
  WasteReason,
} from "@/types";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import {
  getInventoryBalances, getInventoryMovements, getProductionBatches, getPurchaseReceipts, getWasteRecords,
  persistCompletedProductionBatch, persistInventoryAdjustment, persistProductSale,
  persistPurchaseReceipt, persistWaste,
} from "../infrastructure/firestore-operations-repository";
import {
  getFinanceIngredients,
  getRecipeVersionById,
} from "../infrastructure/firestore-costing-repository";
import { convertToBaseQuantity, type PurchaseUnit } from "../domain/unit-conversion";

function positiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validOperationalDate(value: Date) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 5 * 60_000;
}

const wasteReasons = new Set<WasteReason>([
  "expired", "production_defect", "damaged", "overproduction",
  "cancelled_order", "stocktake_variance", "internal_use", "sample",
]);

export async function receiveIngredientPurchase(input: {
  idempotencyKey: string; supplierId?: string; documentNumber?: string;
  locationId: string;
  lines: Array<{
    ingredientId: string;
    quantity?: number;
    purchaseQuantity?: number;
    purchaseUnit?: IngredientPurchaseUnit;
    purchaseUnitLabel?: string;
    purchasePackQuantity?: number;
    purchasePackCount?: number;
    lineAmount: number;
  }>;
  occurredAt: Date;
  actor: string;
}) {
  const uniqueIngredients = new Set(input.lines.map((line) => line.ingredientId));
  if (!input.idempotencyKey || !input.locationId || !validOperationalDate(input.occurredAt) || input.lines.length === 0 ||
      uniqueIngredients.size !== input.lines.length || input.lines.some((line) =>
        !line.ingredientId || !nonNegativeInteger(line.lineAmount))) {
    throw new Error("INVALID_PURCHASE_RECEIPT");
  }
  const ingredients = await getFinanceIngredients();
  const ingredientsById = new Map(ingredients.map((item) => [item.id, item]));
  const lines = input.lines.map((line) => {
    const ingredient = ingredientsById.get(line.ingredientId);
    if (!ingredient?.isActive) throw new Error("INGREDIENT_NOT_AVAILABLE");
    const purchaseUnit = (line.purchaseUnit ?? ingredient.baseUnit) as PurchaseUnit;
    const purchaseQuantity = line.purchaseQuantity ?? line.quantity;
    if (typeof purchaseQuantity !== "number") throw new Error("INVALID_PURCHASE_RECEIPT");
    let converted: ReturnType<typeof convertToBaseQuantity>;
    try {
      converted = convertToBaseQuantity(purchaseQuantity, purchaseUnit);
    } catch {
      throw new Error("INVALID_PURCHASE_RECEIPT");
    }
    if (converted.unit !== ingredient.baseUnit) {
      throw new Error("PURCHASE_UNIT_MISMATCH");
    }
    const hasPackMetadata =
      line.purchasePackQuantity !== undefined ||
      line.purchasePackCount !== undefined ||
      line.purchaseUnitLabel !== undefined;
    if (hasPackMetadata) {
      const normalizedFromPack =
        Number(line.purchasePackQuantity) * Number(line.purchasePackCount);
      if (
        !line.purchaseUnitLabel?.trim() ||
        typeof line.purchasePackQuantity !== "number" ||
        typeof line.purchasePackCount !== "number" ||
        line.purchasePackQuantity <= 0 ||
        line.purchasePackCount <= 0 ||
        !Number.isSafeInteger(normalizedFromPack) ||
        normalizedFromPack !== converted.value
      ) {
        throw new Error("INVALID_PURCHASE_RECEIPT");
      }
    }
    return {
      ingredientId: line.ingredientId,
      quantity: converted.value,
      purchaseQuantity,
      purchaseUnit,
      ...(hasPackMetadata ? {
        purchaseUnitLabel: line.purchaseUnitLabel!.trim(),
        purchasePackQuantity: line.purchasePackQuantity!,
        purchasePackCount: line.purchasePackCount!,
      } : {}),
      lineAmount: line.lineAmount,
    };
  });
  const receipt = await persistPurchaseReceipt({
    ...input,
    lines,
    occurredAt: new Date(input.occurredAt),
    createdBy: input.actor,
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
  const allowedIngredients = new Map(
    recipe?.ingredients.map((line) => [
      line.ingredientId,
      line.componentType ?? "ingredient",
    ]),
  );
  const costs = [input.packagingCost, input.directLaborCost, input.overheadCost, input.damagedQuantity];
  if (!recipe || recipe.productId !== input.productId || recipe.status !== "active" ||
      !input.idempotencyKey || !input.locationId || !validOperationalDate(input.occurredAt) || !positiveInteger(input.plannedQuantity) ||
      !positiveInteger(input.actualGoodQuantity) || costs.some((value) => !nonNegativeInteger(value)) ||
      input.actualGoodQuantity + input.damagedQuantity !== input.plannedQuantity ||
      uniqueIngredients.size !== input.ingredientUsages.length || input.ingredientUsages.length === 0 ||
      uniqueIngredients.size !== allowedIngredients.size ||
      input.ingredientUsages.some((usage) =>
        !allowedIngredients.has(usage.ingredientId) ||
        (usage.componentType ?? "ingredient") !==
          allowedIngredients.get(usage.ingredientId) ||
        !positiveInteger(usage.actualQuantity))) {
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
  if (!validOperationalDate(input.occurredAt) || !wasteReasons.has(input.reason)) {
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

export async function recordInventoryAdjustment(input: {
  idempotencyKey: string;
  itemType: InventoryItemType;
  itemId: string;
  locationId: string;
  direction: "in" | "out";
  quantity: number;
  inventoryValue?: number;
  reason: string;
  occurredAt: Date;
  actor: string;
}) {
  if (!input.idempotencyKey || !input.itemId || !input.locationId ||
      !["ingredient", "product"].includes(input.itemType) ||
      !["in", "out"].includes(input.direction) ||
      !positiveInteger(input.quantity) ||
      (input.direction === "in" && !nonNegativeInteger(input.inventoryValue ?? -1)) ||
      !input.reason.trim() || !validOperationalDate(input.occurredAt)) {
    throw new Error("INVALID_INVENTORY_ADJUSTMENT");
  }
  const adjustment = await persistInventoryAdjustment({
    ...input,
    occurredAt: new Date(input.occurredAt),
    createdBy: input.actor,
  });
  if (adjustment) await financeRepository.record({
    action: "inventory_adjusted",
    entityType: "inventory_adjustment",
    entityId: adjustment.id,
    actor: input.actor,
    metadata: {
      itemType: input.itemType,
      itemId: input.itemId,
      direction: input.direction,
      quantity: input.quantity,
      reason: input.reason,
    },
  });
  return adjustment;
}

export { getInventoryBalances, getInventoryMovements, getProductionBatches, getPurchaseReceipts, getWasteRecords };

export async function recordProductSaleInventory(input: {
  orderId: string; locationId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitStandardCost?: number;
    selectedVariantId?: string;
    selectedVariantSku?: string;
    selectedVariantBarcode?: string;
    inventoryQuantityPerUnit?: number;
  }>;
  occurredAt?: Date; actor: string;
}) {
  const quantities = new Map<string, number>();
  const unitCosts = new Map<string, number>();
  const variants = new Map<string, Map<string, {
    variantId?: string;
    variantSku?: string;
    variantBarcode?: string;
    quantity: number;
  }>>();
  for (const item of input.items) {
    const inventoryQuantityPerUnit = item.inventoryQuantityPerUnit ?? 1;
    if (!item.productId || !positiveInteger(item.quantity) ||
        !positiveInteger(inventoryQuantityPerUnit) ||
        (item.unitStandardCost !== undefined && !nonNegativeInteger(item.unitStandardCost))) {
      throw new Error("INVALID_SALE_INVENTORY");
    }
    const inventoryQuantity = item.quantity * inventoryQuantityPerUnit;
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + inventoryQuantity,
    );
    if (item.unitStandardCost !== undefined) unitCosts.set(item.productId, item.unitStandardCost);
    if (item.selectedVariantId || item.selectedVariantSku || item.selectedVariantBarcode) {
      const productVariants = variants.get(item.productId) ?? new Map();
      const key = item.selectedVariantId || item.selectedVariantSku || item.selectedVariantBarcode || "default";
      const existing = productVariants.get(key);
      productVariants.set(key, {
        variantId: item.selectedVariantId,
        variantSku: item.selectedVariantSku,
        variantBarcode: item.selectedVariantBarcode,
        quantity: (existing?.quantity ?? 0) + inventoryQuantity,
      });
      variants.set(item.productId, productVariants);
    }
  }
  return persistProductSale({
    idempotencyKey: `order:${input.orderId}:inventory-sale`,
    orderId: input.orderId,
    locationId: input.locationId ?? "main",
    items: [...quantities].map(([productId, quantity]) => ({
      productId,
      quantity,
      unitStandardCost: unitCosts.get(productId),
      variantBreakdown: [...(variants.get(productId)?.values() ?? [])],
    })),
    occurredAt: input.occurredAt ?? new Date(),
    createdBy: input.actor,
  });
}
