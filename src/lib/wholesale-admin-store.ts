import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import { normalizeCategoryReference } from "@/lib/product-category";
import { getProductIdentifierValues } from "@/lib/product-identifiers";
import type { Product } from "@/types";

type RecordData = Record<string, unknown>;

const db = () => getAdminFirestore();

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(value as RecordData)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, clean(item)]),
    );
  }
  return value;
}

function jsonValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as RecordData).map(([key, item]) => [key, jsonValue(item)]),
    );
  }
  return value;
}

function record(id: string, data: RecordData) {
  return jsonValue({ id, ...data }) as RecordData & { id: string };
}

export async function listWholesaleRecords(collectionName: string, orderField = "createdAt") {
  let snapshot;
  try {
    snapshot = await db().collection(collectionName).orderBy(orderField, "desc").get();
  } catch {
    snapshot = await db().collection(collectionName).get();
  }
  return snapshot.docs.map((item) => record(item.id, item.data()));
}

export async function getWholesaleRecord(collectionName: string, id: string) {
  const snapshot = await db().collection(collectionName).doc(id).get();
  return snapshot.exists ? record(snapshot.id, snapshot.data() ?? {}) : null;
}

export async function updateWholesaleRecord(collectionName: string, id: string, data: RecordData) {
  const reference = db().collection(collectionName).doc(id);
  if (collectionName === "products") {
    await db().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error("PRODUCT_NOT_FOUND");
      const current = snapshot.data() as Product;
      const next = clean({ ...current, ...data }) as Product;
      const previousIdentifiers = getProductIdentifierValues(current);
      const nextIdentifiers = getProductIdentifierValues(next);
      const allIdentifiers = [...new Set([...previousIdentifiers, ...nextIdentifiers])];
      const refs = allIdentifiers.map((value) =>
        db().collection("product_identifier_registry").doc(encodeURIComponent(value)));
      const reservations = await Promise.all(refs.map((item) => transaction.get(item)));
      reservations.forEach((reservation, index) => {
        const value = allIdentifiers[index];
        if (nextIdentifiers.includes(value) &&
            reservation.exists &&
            reservation.data()?.productId !== id) {
          throw new Error("PRODUCT_IDENTIFIER_EXISTS");
        }
      });
      transaction.set(reference, clean({ ...data, updatedAt: FieldValue.serverTimestamp() }) as RecordData, { merge: true });
      refs.forEach((item, index) => {
        const value = allIdentifiers[index];
        if (nextIdentifiers.includes(value)) {
          transaction.set(item, { productId: id, value, updatedAt: FieldValue.serverTimestamp() });
        } else if (reservations[index].data()?.productId === id) {
          transaction.delete(item);
        }
      });
    });
    return getWholesaleRecord(collectionName, id);
  }
  await reference.set(clean({ ...data, updatedAt: FieldValue.serverTimestamp() }) as RecordData, { merge: true });
  return getWholesaleRecord(collectionName, id);
}

export async function deleteWholesaleRecord(collectionName: string, id: string) {
  if (collectionName === "products") {
    const reference = db().collection(collectionName).doc(id);
    await db().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return;
      const identifiers = getProductIdentifierValues(snapshot.data() as Product);
      const refs = identifiers.map((value) =>
        db().collection("product_identifier_registry").doc(encodeURIComponent(value)));
      const reservations = await Promise.all(refs.map((item) => transaction.get(item)));
      transaction.delete(reference);
      refs.forEach((item, index) => {
        if (reservations[index].data()?.productId === id) transaction.delete(item);
      });
    });
    return;
  }
  await db().collection(collectionName).doc(id).delete();
}

export async function listWholesaleCategories() {
  const snapshot = await db().collection("categories").orderBy("displayOrder", "asc").get();
  return snapshot.docs.map((item) => record(item.id, item.data()));
}

export async function createWholesaleCategory(data: RecordData) {
  const baseId = normalizeCategoryReference(String(data.name ?? "")) || `category-${Date.now()}`;
  let id = baseId;
  let suffix = 2;
  while ((await db().collection("categories").doc(id).get()).exists) id = `${baseId}-${suffix++}`;
  const payload = clean({
    ...data,
    displayOrder: Number(data.displayOrder ?? 0),
    isVisible: data.isVisible !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }) as RecordData;
  await db().collection("categories").doc(id).set(payload);
  return getWholesaleRecord("categories", id);
}

export async function deleteWholesaleCategory(id: string) {
  const assigned = await db().collection("products").where("categoryId", "==", id).limit(1).get();
  if (!assigned.empty) throw new Error("CATEGORY_HAS_PRODUCTS");
  await deleteWholesaleRecord("categories", id);
}

export async function reorderWholesaleCategories(items: Array<{ id: string; displayOrder: number }>) {
  const batch = db().batch();
  items.forEach((item) => batch.set(
    db().collection("categories").doc(item.id),
    { displayOrder: item.displayOrder, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  ));
  await batch.commit();
}

export async function moveWholesaleCategoryProducts(fromId: string, toId: string) {
  const snapshot = await db().collection("products").where("categoryId", "==", fromId).get();
  if (snapshot.empty) return 0;
  const batch = db().batch();
  snapshot.docs.forEach((item) => batch.set(item.ref, {
    categoryId: toId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
  return snapshot.size;
}

export async function createWholesaleCustomer(data: RecordData) {
  const id = String(data.phone ?? "").replace(/\D/g, "");
  const reference = db().collection("customers").doc(id);
  if ((await reference.get()).exists) throw new Error("Customer with this phone already exists");
  const payload = clean({
    ...data,
    phone: id,
    status: data.status ?? "active",
    tags: Array.isArray(data.tags) ? data.tags : [],
    loyaltyPoints: Number(data.loyaltyPoints ?? 0),
    totalOrders: Number(data.totalOrders ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    personalization: data.personalization ?? {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }) as RecordData;
  await reference.create(payload);
  return getWholesaleRecord("customers", id);
}

export async function createWholesaleProduct(data: RecordData) {
  const reference = db().collection("products").doc();
  const payload = clean({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }) as RecordData;
  const identifiers = getProductIdentifierValues(data as unknown as Product);
  const refs = identifiers.map((value) =>
    db().collection("product_identifier_registry").doc(encodeURIComponent(value)));
  await db().runTransaction(async (transaction) => {
    const reservations = await Promise.all(refs.map((item) => transaction.get(item)));
    if (reservations.some((snapshot) => snapshot.exists)) {
      throw new Error("PRODUCT_IDENTIFIER_EXISTS");
    }
    transaction.create(reference, payload);
    refs.forEach((item, index) => transaction.create(item, {
      productId: reference.id,
      value: identifiers[index],
      updatedAt: FieldValue.serverTimestamp(),
    }));
  });
  return getWholesaleRecord("products", reference.id);
}

export async function getWholesaleOrdersPage(pageSize: number, cursor?: string) {
  const size = Math.min(200, Math.max(1, Math.floor(pageSize || 100)));
  let query = db().collection("orders").orderBy("createdAt", "desc").limit(size);
  if (cursor) {
    const cursorDoc = await db().collection("orders").doc(cursor).get();
    if (!cursorDoc.exists) throw new Error("INVALID_ORDER_CURSOR");
    query = query.startAfter(cursorDoc);
  }
  const snapshot = await query.get();
  const lastDocument = snapshot.docs[snapshot.docs.length - 1];
  return {
    orders: snapshot.docs.map((item) => record(item.id, item.data())),
    nextCursor: snapshot.size === size ? lastDocument?.id ?? null : null,
  };
}
