import {
  collection, doc, getDocs, query, runTransaction, serverTimestamp, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import type {
  InventoryBalance, InventoryItemType, InventoryMovement, ProductionBatch,
  ProductionIngredientUsage, PurchaseReceipt, WasteReason,
} from "@/types";
import { calculateActualBatchCost, calculateWeightedBalance, consumeWeightedInventory } from "../domain/inventory-costing";

const BALANCES = "inventory_balances";
const MOVEMENTS = "inventory_movements";
const PURCHASES = "purchase_receipts";
const BATCHES = "production_batches";
const WASTE = "inventory_waste_records";

const key = (...parts: Array<string | number>) => encodeURIComponent(parts.join(":"));
const balanceRef = (type: InventoryItemType, itemId: string, locationId: string) =>
  doc(db, BALANCES, key(type, locationId, itemId));

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
  const receiptId = key(input.idempotencyKey);
  const receiptRef = doc(db, PURCHASES, receiptId);
  const totalAmount = input.lines.reduce((sum, line) => sum + line.lineAmount, 0);
  const refs = input.lines.map((line) => balanceRef("ingredient", line.ingredientId, input.locationId));

  const created = await runTransaction(db, async (transaction) => {
    if ((await transaction.get(receiptRef)).exists()) return false;
    const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
    input.lines.forEach((line, index) => {
      const current = balanceFromData("ingredient", line.ingredientId, input.locationId, snapshots[index].data());
      const next = calculateWeightedBalance({
        currentQuantity: current.quantity, currentValue: current.inventoryValue,
        receivedQuantity: line.quantity, receivedValue: line.lineAmount,
      });
      transaction.set(refs[index], { ...current, ...next, updatedAt: serverTimestamp() });
      transaction.set(doc(db, MOVEMENTS, key(input.idempotencyKey, line.ingredientId)), {
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
  const batchId = key(input.idempotencyKey);
  const batchRef = doc(db, BATCHES, batchId);
  const ingredientRefs = input.ingredientUsages.map((usage) =>
    balanceRef("ingredient", usage.ingredientId, input.locationId));
  const productRef = balanceRef("product", input.productId, input.locationId);
  const productCatalogRef = doc(db, "products", input.productId);

  return runTransaction(db, async (transaction) => {
    if ((await transaction.get(batchRef)).exists()) return null;
    const ingredientSnapshots = await Promise.all(
      ingredientRefs.map((reference) => transaction.get(reference)),
    );
    const productSnapshot = await transaction.get(productRef);
    const productCatalogSnapshot = await transaction.get(productCatalogRef);
    if (!productCatalogSnapshot.exists()) throw new Error("PRODUCT_NOT_FOUND");
    let ingredientCost = 0;
    const costedUsages = input.ingredientUsages.map((usage, index) => {
      const current = balanceFromData("ingredient", usage.ingredientId, input.locationId, ingredientSnapshots[index].data());
      const consumed = consumeWeightedInventory(current, usage.actualQuantity);
      ingredientCost += consumed.consumedValue;
      transaction.set(ingredientRefs[index], { ...consumed.nextBalance, updatedAt: serverTimestamp() });
      transaction.set(doc(db, MOVEMENTS, key(input.idempotencyKey, "issue", usage.ingredientId)), {
        itemType: "ingredient", itemId: usage.ingredientId, locationId: input.locationId,
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
    transaction.set(doc(db, MOVEMENTS, key(input.idempotencyKey, "output")), {
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
  const wasteId = key(input.idempotencyKey);
  const wasteRef = doc(db, WASTE, wasteId);
  const stockRef = balanceRef(input.itemType, input.itemId, input.locationId);
  const productCatalogRef = input.itemType === "product"
    ? doc(db, "products", input.itemId)
    : null;
  return runTransaction(db, async (transaction) => {
    if ((await transaction.get(wasteRef)).exists()) return null;
    const snapshot = await transaction.get(stockRef);
    const productSnapshot = productCatalogRef
      ? await transaction.get(productCatalogRef)
      : null;
    const current = balanceFromData(input.itemType, input.itemId, input.locationId, snapshot.data());
    if (!snapshot.exists() && productSnapshot) {
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
    transaction.set(doc(db, MOVEMENTS, key(input.idempotencyKey, "movement")), {
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

type InventoryReadFilter = { itemType: InventoryItemType; itemId: string };

export async function getInventoryBalances(filter?: InventoryReadFilter) {
  const source = collection(db, BALANCES);
  const snapshot = filter
    ? await getDocs(query(source, where("itemType", "==", filter.itemType), where("itemId", "==", filter.itemId)))
    : await getDocs(source);
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
  const source = collection(db, MOVEMENTS);
  const snapshot = filter
    ? await getDocs(query(source, where("itemType", "==", filter.itemType), where("itemId", "==", filter.itemId)))
    : await getDocs(source);
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
  const snapshot = await getDocs(collection(db, PURCHASES));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getProductionBatches() {
  const snapshot = await getDocs(collection(db, BATCHES));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getWasteRecords() {
  const snapshot = await getDocs(collection(db, WASTE));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function persistProductSale(input: {
  idempotencyKey: string;
  orderId: string;
  locationId: string;
  items: Array<{ productId: string; quantity: number; unitStandardCost?: number }>;
  occurredAt: Date;
  createdBy: string;
}) {
  const markerRef = doc(db, "inventory_sale_records", key(input.idempotencyKey));
  const stockRefs = input.items.map((item) => balanceRef("product", item.productId, input.locationId));
  const productRefs = input.items.map((item) => doc(db, "products", item.productId));
  return runTransaction(db, async (transaction) => {
    const marker = await transaction.get(markerRef);
    if (marker.exists()) {
      return { inventoryValue: Number(marker.data().inventoryValue ?? 0), created: false };
    }
    const stockSnapshots = await Promise.all(stockRefs.map((reference) => transaction.get(reference)));
    const productSnapshots = await Promise.all(productRefs.map((reference) => transaction.get(reference)));
    let inventoryValue = 0;
    input.items.forEach((item, index) => {
      const stored = stockSnapshots[index].data();
      const legacyQuantity = Number(productSnapshots[index].data()?.stock ?? 0);
      const current = balanceFromData("product", item.productId, input.locationId, stored);
      if (!stockSnapshots[index].exists()) {
        current.quantity = legacyQuantity;
        current.inventoryValue = legacyQuantity * (item.unitStandardCost ?? 0);
      }
      const consumed = consumeWeightedInventory(current, item.quantity);
      inventoryValue += consumed.consumedValue;
      transaction.set(stockRefs[index], { ...consumed.nextBalance, updatedAt: serverTimestamp() });
      transaction.update(productRefs[index], { stock: consumed.nextBalance.quantity, updatedAt: serverTimestamp() });
      transaction.set(doc(db, MOVEMENTS, key(input.idempotencyKey, item.productId)), {
        itemType: "product", itemId: item.productId, locationId: input.locationId,
        type: "sale", direction: "out", quantity: item.quantity,
        inventoryValue: consumed.consumedValue, referenceType: "order", referenceId: input.orderId,
        idempotencyKey: `${input.idempotencyKey}:${item.productId}`,
        occurredAt: input.occurredAt, createdBy: input.createdBy,
      });
    });
    transaction.set(markerRef, { orderId: input.orderId, inventoryValue, createdAt: serverTimestamp() });
    return { inventoryValue, created: true };
  });
}
