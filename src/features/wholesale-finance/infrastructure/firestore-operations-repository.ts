import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type {
  InventoryBalance, InventoryItemType, InventoryMovement, ProductionBatch,
  ProductionIngredientUsage, PurchaseReceipt, WasteReason,
} from "@/types";
import type {
  ProductionGroup,
  ProductionPlanCompletion,
} from "@/types/production-plan";
import { calculateActualBatchCost, calculateWeightedBalance, consumeWeightedInventory } from "../domain/inventory-costing";

const BALANCES = "inventory_balances";
const MOVEMENTS = "inventory_movements";
const PURCHASES = "purchase_receipts";
const BATCHES = "production_batches";
const PLAN_COMPLETIONS = "production_plan_completions";
const WASTE = "inventory_waste_records";
const ADJUSTMENTS = "inventory_adjustments";
const INGREDIENTS = "finance_ingredients";
const INGREDIENT_COSTS = "finance_ingredient_cost_versions";

const key = (...parts: Array<string | number>) => encodeURIComponent(parts.join(":"));
const balanceRef = (type: InventoryItemType, itemId: string, locationId: string) =>
  getAdminFirestore().collection(BALANCES).doc(key(type, locationId, itemId));
const serverTimestamp = () => FieldValue.serverTimestamp();

function balanceFromData(
  itemType: InventoryItemType,
  itemId: string,
  locationId: string,
  data?: Record<string, unknown>,
): InventoryBalance {
  return {
    itemType, itemId, locationId,
    quantity: Number(data?.quantity ?? 0),
    inventoryValue: Number(data?.inventoryValue ?? 0),
  };
}

export async function persistPurchaseReceipt(
  input: Omit<PurchaseReceipt, "id" | "totalAmount"> & { idempotencyKey: string },
) {
  const db = getAdminFirestore();
  const receiptId = key(input.idempotencyKey);
  const receiptRef = db.collection(PURCHASES).doc(receiptId);
  const totalAmount = input.lines.reduce((sum, line) => sum + line.lineAmount, 0);
  const refs = input.lines.map((line) => balanceRef("ingredient", line.ingredientId, input.locationId));
  const ingredientRefs = input.lines.map((line) => db.collection(INGREDIENTS).doc(line.ingredientId));

  const created = await db.runTransaction(async (transaction) => {
    if ((await transaction.get(receiptRef)).exists) return false;
    const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
    const ingredientSnapshots = await Promise.all(
      ingredientRefs.map((reference) => transaction.get(reference)),
    );
    input.lines.forEach((line, index) => {
      const ingredient = ingredientSnapshots[index];
      if (!ingredient.exists || ingredient.data()?.isActive === false) {
        throw new Error(`INGREDIENT_NOT_AVAILABLE:${line.ingredientId}`);
      }
      const current = balanceFromData("ingredient", line.ingredientId, input.locationId, snapshots[index].data());
      const next = calculateWeightedBalance({
        currentQuantity: current.quantity, currentValue: current.inventoryValue,
        receivedQuantity: line.quantity, receivedValue: line.lineAmount,
      });
      const weightedCostMicros = Math.round(next.inventoryValue * 1_000_000 / next.quantity);
      transaction.set(refs[index], { ...current, ...next, updatedAt: serverTimestamp() });
      transaction.update(ingredientRefs[index], {
        costPerBaseUnitMicros: weightedCostMicros,
        updatedAt: serverTimestamp(),
      });
      transaction.set(db.collection(INGREDIENT_COSTS).doc(key(input.idempotencyKey, "cost", line.ingredientId)), {
        ingredientId: line.ingredientId,
        costPerBaseUnitMicros: weightedCostMicros,
        effectiveFrom: input.occurredAt,
        source: `purchase:${receiptId}`,
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      });
      transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, line.ingredientId)), {
        itemType: "ingredient", itemId: line.ingredientId, locationId: input.locationId,
        type: "purchase_receipt", direction: "in", quantity: line.quantity,
        inventoryValue: line.lineAmount, referenceType: "purchase", referenceId: receiptId,
        idempotencyKey: `${input.idempotencyKey}:${line.ingredientId}`,
        occurredAt: input.occurredAt, createdBy: input.createdBy,
      });
    });
    transaction.set(receiptRef, {
      supplierId: input.supplierId ?? null, documentNumber: input.documentNumber ?? null,
      locationId: input.locationId, lines: input.lines, totalAmount,
      occurredAt: input.occurredAt, createdBy: input.createdBy, createdAt: serverTimestamp(),
    });
    return true;
  });
  return created ? { id: receiptId, ...input, totalAmount } : null;
}

export async function persistCompletedProductionBatch(input: {
  idempotencyKey: string;
  productId: string;
  recipeVersionId: string;
  locationId: string;
  plannedQuantity: number;
  actualGoodQuantity: number;
  damagedQuantity: number;
  ingredientUsages: ProductionIngredientUsage[];
  packagingCost: number;
  directLaborCost: number;
  overheadCost: number;
  occurredAt: Date;
  createdBy: string;
}): Promise<ProductionBatch | null> {
  const db = getAdminFirestore();
  const batchId = key(input.idempotencyKey);
  const batchRef = db.collection(BATCHES).doc(batchId);
  const componentRefs = input.ingredientUsages.map((usage) =>
    balanceRef(
      usage.componentType === "semi_finished" ? "product" : "ingredient",
      usage.ingredientId,
      input.locationId,
    ));
  const productRef = balanceRef("product", input.productId, input.locationId);
  const productCatalogRef = db.collection("products").doc(input.productId);

  return db.runTransaction(async (transaction) => {
    if ((await transaction.get(batchRef)).exists) return null;
    const componentSnapshots = await Promise.all(
      componentRefs.map((reference) => transaction.get(reference)),
    );
    const productSnapshot = await transaction.get(productRef);
    const productCatalogSnapshot = await transaction.get(productCatalogRef);
    if (!productCatalogSnapshot.exists) throw new Error("PRODUCT_NOT_FOUND");
    let ingredientCost = 0;
    const costedUsages = input.ingredientUsages.map((usage, index) => {
      const itemType =
        usage.componentType === "semi_finished" ? "product" : "ingredient";
      const current = balanceFromData(
        itemType,
        usage.ingredientId,
        input.locationId,
        componentSnapshots[index].data(),
      );
      const consumed = consumeWeightedInventory(current, usage.actualQuantity);
      ingredientCost += consumed.consumedValue;
      transaction.set(componentRefs[index], { ...consumed.nextBalance, updatedAt: serverTimestamp() });
      if (itemType === "product") {
        transaction.update(db.collection("products").doc(usage.ingredientId), {
          stock: consumed.nextBalance.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "issue", usage.ingredientId)), {
        itemType, itemId: usage.ingredientId, locationId: input.locationId,
        type: "production_issue", direction: "out", quantity: usage.actualQuantity,
        inventoryValue: consumed.consumedValue, referenceType: "production_batch",
        referenceId: batchId, idempotencyKey: `${input.idempotencyKey}:issue:${usage.ingredientId}`,
        occurredAt: input.occurredAt, createdBy: input.createdBy,
      });
      return { ...usage, actualCost: consumed.consumedValue };
    });
    const actualCost = calculateActualBatchCost({
      usages: costedUsages, ingredientCost, packagingCost: input.packagingCost,
      directLaborCost: input.directLaborCost, overheadCost: input.overheadCost,
      actualGoodQuantity: input.actualGoodQuantity,
    });
    const currentProduct = balanceFromData("product", input.productId, input.locationId, productSnapshot.data());
    const nextProduct = calculateWeightedBalance({
      currentQuantity: currentProduct.quantity, currentValue: currentProduct.inventoryValue,
      receivedQuantity: input.actualGoodQuantity, receivedValue: actualCost.totalActualCost,
    });
    transaction.set(productRef, { ...currentProduct, ...nextProduct, updatedAt: serverTimestamp() });
    transaction.update(productCatalogRef, {
      stock: nextProduct.quantity,
      updatedAt: serverTimestamp(),
    });
    transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "output")), {
      itemType: "product", itemId: input.productId, locationId: input.locationId,
      type: "production_output", direction: "in", quantity: input.actualGoodQuantity,
      inventoryValue: actualCost.totalActualCost, referenceType: "production_batch",
      referenceId: batchId, idempotencyKey: `${input.idempotencyKey}:output`,
      occurredAt: input.occurredAt, createdBy: input.createdBy,
    });
    const batch: ProductionBatch = {
      id: batchId, productId: input.productId, recipeVersionId: input.recipeVersionId,
      locationId: input.locationId, plannedQuantity: input.plannedQuantity,
      actualGoodQuantity: input.actualGoodQuantity, damagedQuantity: input.damagedQuantity,
      ingredientUsages: costedUsages, packagingCost: input.packagingCost,
      directLaborCost: input.directLaborCost, overheadCost: input.overheadCost,
      ...actualCost, status: "completed", occurredAt: input.occurredAt,
      createdBy: input.createdBy,
    };
    transaction.set(batchRef, { ...batch, createdAt: serverTimestamp() });
    return batch;
  });
}

export async function persistWaste(input: {
  idempotencyKey: string; itemType: InventoryItemType; itemId: string;
  locationId: string; quantity: number; reason: WasteReason;
  occurredAt: Date; createdBy: string;
}) {
  const db = getAdminFirestore();
  const wasteId = key(input.idempotencyKey);
  const wasteRef = db.collection(WASTE).doc(wasteId);
  const stockRef = balanceRef(input.itemType, input.itemId, input.locationId);
  const productCatalogRef = input.itemType === "product"
    ? db.collection("products").doc(input.itemId)
    : null;
  return db.runTransaction(async (transaction) => {
    if ((await transaction.get(wasteRef)).exists) return null;
    const snapshot = await transaction.get(stockRef);
    const productSnapshot = productCatalogRef
      ? await transaction.get(productCatalogRef)
      : null;
    const current = balanceFromData(input.itemType, input.itemId, input.locationId, snapshot.data());
    if (!snapshot.exists && productSnapshot) {
      current.quantity = Number(productSnapshot.data()?.stock ?? 0);
    }
    const consumed = consumeWeightedInventory(current, input.quantity);
    transaction.set(stockRef, { ...consumed.nextBalance, updatedAt: serverTimestamp() });
    if (productCatalogRef) {
      transaction.update(productCatalogRef, {
        stock: consumed.nextBalance.quantity,
        updatedAt: serverTimestamp(),
      });
    }
    transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "movement")), {
      itemType: input.itemType, itemId: input.itemId, locationId: input.locationId,
      type: "waste", direction: "out", quantity: input.quantity,
      inventoryValue: consumed.consumedValue, referenceType: "waste", referenceId: wasteId,
      idempotencyKey: `${input.idempotencyKey}:movement`, occurredAt: input.occurredAt,
      createdBy: input.createdBy,
    });
    const result = { ...input, id: wasteId, inventoryValue: consumed.consumedValue };
    transaction.set(wasteRef, { ...result, createdAt: serverTimestamp() });
    return result;
  });
}

export async function persistProductionPlanCompletion(input: {
  idempotencyKey: string;
  group: ProductionGroup;
  batchCount: number;
  locationId: string;
  outputs: Array<{ productId: string; plannedQuantity: number; actualQuantity: number }>;
  materials: Array<{
    itemType: InventoryItemType;
    itemId: string;
    plannedQuantity: number;
    actualQuantity: number;
  }>;
  occurredAt: Date;
  createdBy: string;
}): Promise<ProductionPlanCompletion> {
  const db = getAdminFirestore();
  const completionId = key(input.idempotencyKey);
  const requestFingerprint = JSON.stringify({
    groupId: input.group.id,
    batchCount: input.batchCount,
    locationId: input.locationId,
    outputs: input.outputs,
    materials: input.materials,
    occurredAt: input.occurredAt.toISOString(),
  });
  const completionRef = db.collection(PLAN_COMPLETIONS).doc(completionId);
  const materialRefs = input.materials.map((line) =>
    balanceRef(line.itemType, line.itemId, input.locationId));
  const outputRefs = input.outputs.map((line) =>
    balanceRef("product", line.productId, input.locationId));
  const materialProductRefs = input.materials.map((line) =>
    line.itemType === "product" ? db.collection("products").doc(line.itemId) : null);
  const outputProductRefs = input.outputs.map((line) =>
    db.collection("products").doc(line.productId));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(completionRef);
    if (existing.exists) {
      const data = existing.data()!;
      if (data.requestFingerprint !== requestFingerprint) {
        throw new Error("IDEMPOTENCY_KEY_REUSED");
      }
      return { id: existing.id, ...data } as ProductionPlanCompletion;
    }

    const materialSnapshots = await Promise.all(
      materialRefs.map((reference) => transaction.get(reference)),
    );
    const outputSnapshots = await Promise.all(
      outputRefs.map((reference) => transaction.get(reference)),
    );
    const materialProductSnapshots = await Promise.all(
      materialProductRefs.map((reference) => reference ? transaction.get(reference) : null),
    );
    const outputProductSnapshots = await Promise.all(
      outputProductRefs.map((reference) => transaction.get(reference)),
    );
    if (outputProductSnapshots.some((snapshot) => !snapshot.exists) ||
        materialProductSnapshots.some((snapshot) => snapshot && !snapshot.exists)) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    let totalInventoryValue = 0;
    const materials = input.materials.map((line, index) => {
      const current = balanceFromData(
        line.itemType, line.itemId, input.locationId, materialSnapshots[index].data(),
      );
      const consumed = consumeWeightedInventory(current, line.actualQuantity);
      totalInventoryValue += consumed.consumedValue;
      transaction.set(materialRefs[index], {
        ...consumed.nextBalance,
        updatedAt: serverTimestamp(),
      });
      if (materialProductRefs[index]) {
        transaction.update(materialProductRefs[index]!, {
          stock: consumed.nextBalance.quantity,
          updatedAt: serverTimestamp(),
        });
      }
      transaction.set(
        db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "issue", line.itemType, line.itemId)),
        {
          itemType: line.itemType,
          itemId: line.itemId,
          locationId: input.locationId,
          type: "production_issue",
          direction: "out",
          quantity: line.actualQuantity,
          inventoryValue: consumed.consumedValue,
          referenceType: "production_batch",
          referenceId: completionId,
          idempotencyKey: `${input.idempotencyKey}:issue:${line.itemType}:${line.itemId}`,
          occurredAt: input.occurredAt,
          createdBy: input.createdBy,
        },
      );
      return { ...line, inventoryValue: consumed.consumedValue };
    });

    const weights = input.outputs.map((line) => {
      const configured = input.group.outputLines.find((item) => item.productId === line.productId);
      return line.actualQuantity * (configured?.quantityPerUnit ?? 1);
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let allocatedValue = 0;
    const outputs = input.outputs.map((line, index) => {
      const outputValue = index === input.outputs.length - 1
        ? totalInventoryValue - allocatedValue
        : Math.round(totalInventoryValue * weights[index] / totalWeight);
      allocatedValue += outputValue;
      const current = balanceFromData(
        "product", line.productId, input.locationId, outputSnapshots[index].data(),
      );
      const next = calculateWeightedBalance({
        currentQuantity: current.quantity,
        currentValue: current.inventoryValue,
        receivedQuantity: line.actualQuantity,
        receivedValue: outputValue,
      });
      transaction.set(outputRefs[index], { ...current, ...next, updatedAt: serverTimestamp() });
      transaction.update(outputProductRefs[index], {
        stock: next.quantity,
        updatedAt: serverTimestamp(),
      });
      transaction.set(
        db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "output", line.productId)),
        {
          itemType: "product",
          itemId: line.productId,
          locationId: input.locationId,
          type: "production_output",
          direction: "in",
          quantity: line.actualQuantity,
          inventoryValue: outputValue,
          referenceType: "production_batch",
          referenceId: completionId,
          idempotencyKey: `${input.idempotencyKey}:output:${line.productId}`,
          occurredAt: input.occurredAt,
          createdBy: input.createdBy,
        },
      );
      return { ...line, inventoryValue: outputValue };
    });

    const completion: ProductionPlanCompletion = {
      id: completionId,
      groupId: input.group.id,
      groupName: input.group.name,
      batchCount: input.batchCount,
      locationId: input.locationId,
      outputs,
      materials,
      totalInventoryValue,
      occurredAt: input.occurredAt,
      createdBy: input.createdBy,
    };
    transaction.set(completionRef, {
      ...completion,
      requestFingerprint,
      createdAt: serverTimestamp(),
    });
    return completion;
  });
}

export async function persistInventoryAdjustment(input: {
  idempotencyKey: string;
  itemType: InventoryItemType;
  itemId: string;
  locationId: string;
  direction: "in" | "out";
  quantity: number;
  inventoryValue?: number;
  reason: string;
  occurredAt: Date;
  createdBy: string;
}) {
  const db = getAdminFirestore();
  const adjustmentId = key(input.idempotencyKey);
  const adjustmentRef = db.collection(ADJUSTMENTS).doc(adjustmentId);
  const stockRef = balanceRef(input.itemType, input.itemId, input.locationId);
  const productCatalogRef = input.itemType === "product"
    ? db.collection("products").doc(input.itemId)
    : null;
  return db.runTransaction(async (transaction) => {
    if ((await transaction.get(adjustmentRef)).exists) return null;
    const snapshot = await transaction.get(stockRef);
    const productSnapshot = productCatalogRef
      ? await transaction.get(productCatalogRef)
      : null;
    const current = balanceFromData(input.itemType, input.itemId, input.locationId, snapshot.data());
    if (!snapshot.exists && productSnapshot) {
      current.quantity = Number(productSnapshot.data()?.stock ?? 0);
    }
    const next = input.direction === "in"
      ? calculateWeightedBalance({
          currentQuantity: current.quantity,
          currentValue: current.inventoryValue,
          receivedQuantity: input.quantity,
          receivedValue: input.inventoryValue ?? 0,
        })
      : consumeWeightedInventory(current, input.quantity).nextBalance;
    const valueDelta = input.direction === "in"
      ? input.inventoryValue ?? 0
      : current.inventoryValue - next.inventoryValue;
    transaction.set(stockRef, { ...current, ...next, updatedAt: serverTimestamp() });
    if (productCatalogRef) {
      if (!productSnapshot?.exists) throw new Error("PRODUCT_NOT_FOUND");
      transaction.update(productCatalogRef, {
        stock: next.quantity,
        updatedAt: serverTimestamp(),
      });
    }
    transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, "movement")), {
      itemType: input.itemType,
      itemId: input.itemId,
      locationId: input.locationId,
      type: "adjustment",
      direction: input.direction,
      quantity: input.quantity,
      inventoryValue: valueDelta,
      referenceType: "adjustment",
      referenceId: adjustmentId,
      idempotencyKey: `${input.idempotencyKey}:movement`,
      occurredAt: input.occurredAt,
      createdBy: input.createdBy,
    });
    const result = { ...input, id: adjustmentId, inventoryValue: valueDelta };
    transaction.set(adjustmentRef, { ...result, createdAt: serverTimestamp() });
    return result;
  });
}

type InventoryReadFilter = { itemType: InventoryItemType; itemId: string };

export async function getInventoryBalances(filter?: InventoryReadFilter) {
  let source = getAdminFirestore().collection(BALANCES) as FirebaseFirestore.Query;
  if (filter) {
    source = source.where("itemType", "==", filter.itemType)
      .where("itemId", "==", filter.itemId);
  }
  const snapshot = await source.get();
  return snapshot.docs.map((item) => {
    const data = item.data();
    const itemType = filter?.itemType ?? (
      data.itemType === "ingredient" ? "ingredient" : "product"
    );
    const itemId = filter?.itemId ?? String(data.itemId ?? "");
    const locationId = String(data.locationId ?? "");

    return {
      id: item.id,
      ...balanceFromData(itemType, itemId, locationId, data),
    };
  });
}

export async function getInventoryMovements(filter?: InventoryReadFilter) {
  let source = getAdminFirestore().collection(MOVEMENTS) as FirebaseFirestore.Query;
  if (filter) {
    source = source.where("itemType", "==", filter.itemType)
      .where("itemId", "==", filter.itemId);
  }
  const snapshot = await source.get();
  return snapshot.docs.map((item) => {
    const data = item.data();
    const occurredAt = data.occurredAt;
    const normalizedOccurredAt = occurredAt && typeof occurredAt === "object" && "toDate" in occurredAt && typeof occurredAt.toDate === "function"
      ? occurredAt.toDate()
      : occurredAt instanceof Date
        ? occurredAt
        : new Date(String(occurredAt ?? 0));
    return { id: item.id, ...data, occurredAt: normalizedOccurredAt } as InventoryMovement;
  });
}

export async function getPurchaseReceipts() {
  const snapshot = await getAdminFirestore().collection(PURCHASES).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getProductionBatches() {
  const snapshot = await getAdminFirestore().collection(BATCHES).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getWasteRecords() {
  const snapshot = await getAdminFirestore().collection(WASTE).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function persistProductSale(input: {
  idempotencyKey: string;
  orderId: string;
  locationId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitStandardCost?: number;
    variantBreakdown?: Array<{
      variantId?: string;
      variantSku?: string;
      variantBarcode?: string;
      quantity: number;
    }>;
  }>;
  occurredAt: Date;
  createdBy: string;
}) {
  const db = getAdminFirestore();
  const markerRef = db.collection("inventory_sale_records").doc(key(input.idempotencyKey));
  const stockRefs = input.items.map((item) => balanceRef("product", item.productId, input.locationId));
  const productRefs = input.items.map((item) => db.collection("products").doc(item.productId));
  return db.runTransaction(async (transaction) => {
    const marker = await transaction.get(markerRef);
    if (marker.exists) {
      return { inventoryValue: Number(marker.data()?.inventoryValue ?? 0), created: false };
    }
    const stockSnapshots = await Promise.all(stockRefs.map((reference) => transaction.get(reference)));
    const productSnapshots = await Promise.all(productRefs.map((reference) => transaction.get(reference)));
    let inventoryValue = 0;
    input.items.forEach((item, index) => {
      const stored = stockSnapshots[index].data();
      const legacyQuantity = Number(productSnapshots[index].data()?.stock ?? 0);
      const current = balanceFromData("product", item.productId, input.locationId, stored);
      if (!stockSnapshots[index].exists) {
        current.quantity = legacyQuantity;
        current.inventoryValue = legacyQuantity * (item.unitStandardCost ?? 0);
      }
      const consumed = consumeWeightedInventory(current, item.quantity);
      inventoryValue += consumed.consumedValue;
      transaction.set(stockRefs[index], { ...consumed.nextBalance, updatedAt: serverTimestamp() });
      transaction.update(productRefs[index], { stock: consumed.nextBalance.quantity, updatedAt: serverTimestamp() });
      transaction.set(db.collection(MOVEMENTS).doc(key(input.idempotencyKey, item.productId)), {
        itemType: "product", itemId: item.productId, locationId: input.locationId,
        type: "sale", direction: "out", quantity: item.quantity,
        inventoryValue: consumed.consumedValue, referenceType: "order", referenceId: input.orderId,
        variantBreakdown: item.variantBreakdown ?? [],
        idempotencyKey: `${input.idempotencyKey}:${item.productId}`,
        occurredAt: input.occurredAt, createdBy: input.createdBy,
      });
    });
    transaction.set(markerRef, { orderId: input.orderId, inventoryValue, createdAt: serverTimestamp() });
    return { inventoryValue, created: true };
  });
}
