import { doc, getDoc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { normalizeOrder } from "./utils";
import {
  applyStockDelta,
  getEffectiveStock,
} from "@/lib/product-stock";
import type { CartItem, Order, Product } from "@/types";

export type PosOrderCreateInput = Omit<
  Order,
  "id" | "createdAt" | "updatedAt" | "items"
> & { items: Array<Omit<CartItem, "cartItemId">> };

function quantitiesByVariant(items: PosOrderCreateInput["items"]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    const key = [
      item.productId,
      item.selectedSize ?? "default",
      item.selectedFlavor ?? "default",
    ].join("|");
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  }
  return quantities;
}

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutUndefined(item)]),
    ) as T;
  }
  return value;
}

export async function createReservedPosOrderOnce(
  idempotencyKey: string,
  data: PosOrderCreateInput,
) {
  const orderRef = doc(db, "orders", `pos_${idempotencyKey}`);
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const productRefs = productIds.map((id) => doc(db, "products", id));
  const variantQuantities = quantitiesByVariant(data.items);

  const created = await runTransaction(db, async (transaction) => {
    const existingOrder = await transaction.get(orderRef);
    if (existingOrder.exists()) return false;

    const productSnapshots = await Promise.all(
      productRefs.map((productRef) => transaction.get(productRef)),
    );
    for (const productSnapshot of productSnapshots) {
      if (!productSnapshot.exists()) throw new Error("PRODUCT_NOT_FOUND");
      const product = productSnapshot.data() as Product;
      for (const [key, qty] of variantQuantities.entries()) {
        const [pid, sizeId, flavorId] = key.split("|");
        if (pid !== productSnapshot.id) continue;
        const stock = getEffectiveStock(
          product,
          sizeId === "default" ? undefined : sizeId,
          flavorId === "default" ? undefined : flavorId,
        );
        if (typeof stock === "number" && stock < qty) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }
    }

    for (const productSnapshot of productSnapshots) {
      if (!productSnapshot.exists()) continue;
      let nextProduct = productSnapshot.data() as Product;

      for (const item of data.items.filter(
        (line) => line.productId === productSnapshot.id,
      )) {
        nextProduct = {
          ...nextProduct,
          ...applyStockDelta(
            nextProduct,
            -item.quantity,
            item.selectedSize,
            item.selectedFlavor,
          ),
        };
      }

      transaction.update(productSnapshot.ref, withoutUndefined({
        sizeOptions: nextProduct.sizeOptions,
        flavorOptions: nextProduct.flavorOptions,
        variantCombinations: nextProduct.variantCombinations,
        stock: nextProduct.stock,
        updatedAt: Timestamp.now(),
      }));
    }
    transaction.set(orderRef, withoutUndefined({
      ...data,
      idempotencyKey,
      inventoryReservationStatus: "reserved",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }));
    return true;
  });

  const snapshot = await getDoc(orderRef);
  if (!snapshot.exists()) throw new Error("ORDER_CREATE_FAILED");
  return { order: normalizeOrder(snapshot.id, snapshot.data()), created };
}

async function restorePosInventory(
  orderId: string,
  expectedStatus: "reserved" | "consumed",
) {
  const orderRef = doc(db, "orders", orderId);
  return runTransaction(db, async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error("ORDER_NOT_FOUND");
    const order = normalizeOrder(orderSnapshot.id, orderSnapshot.data());
    if (order.inventoryReservationStatus !== expectedStatus) return false;

    const productIds = [...new Set(order.items.map((i) => i.productId))];
    const productRefs = productIds.map((id) => doc(db, "products", id));
    const products = await Promise.all(
      productRefs.map((productRef) => transaction.get(productRef)),
    );

    for (const productSnapshot of products) {
      if (!productSnapshot.exists()) continue;
      let nextProduct = productSnapshot.data() as Product;

      for (const item of order.items.filter(
        (line) => line.productId === productSnapshot.id,
      )) {
        nextProduct = {
          ...nextProduct,
          ...applyStockDelta(
            nextProduct,
            item.quantity,
            item.selectedSize,
            item.selectedFlavor,
          ),
        };
      }

      transaction.update(productSnapshot.ref, withoutUndefined({
        sizeOptions: nextProduct.sizeOptions,
        flavorOptions: nextProduct.flavorOptions,
        variantCombinations: nextProduct.variantCombinations,
        stock: nextProduct.stock,
        updatedAt: Timestamp.now(),
      }));
    }
    transaction.update(orderRef, {
      inventoryReservationStatus: "released",
      updatedAt: Timestamp.now(),
    });
    return true;
  });
}

export function releasePosInventoryReservation(orderId: string) {
  return restorePosInventory(orderId, "reserved");
}

export function returnConsumedPosInventory(orderId: string) {
  return restorePosInventory(orderId, "consumed");
}
