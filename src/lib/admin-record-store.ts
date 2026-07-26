import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

type RecordData = Record<string, unknown>;

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object" &&
      !(value instanceof Date) && !(value instanceof Timestamp)) {
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
      Object.entries(value as RecordData)
        .map(([key, item]) => [key, jsonValue(item)]),
    );
  }
  return value;
}

function record(id: string, data: RecordData) {
  return jsonValue({ id, ...data }) as RecordData & { id: string };
}

export async function listAdminRecords(
  collectionName: string,
  orderField = "createdAt",
) {
  const database = getAdminFirestore();
  let snapshot;
  try {
    snapshot = await database.collection(collectionName)
      .orderBy(orderField, "desc")
      .get();
  } catch {
    snapshot = await database.collection(collectionName).get();
  }
  return snapshot.docs.map((item) => record(item.id, item.data()));
}

export async function listAdminCategories() {
  const snapshot = await getAdminFirestore()
    .collection("categories")
    .orderBy("displayOrder", "asc")
    .get();
  return snapshot.docs.map((item) => record(item.id, item.data()));
}

export async function getAdminRecord(collectionName: string, id: string) {
  const snapshot = await getAdminFirestore()
    .collection(collectionName)
    .doc(id)
    .get();
  return snapshot.exists ? record(snapshot.id, snapshot.data() ?? {}) : null;
}

export async function updateAdminRecord(
  collectionName: string,
  id: string,
  data: RecordData,
) {
  const reference = getAdminFirestore().collection(collectionName).doc(id);
  await reference.set(
    clean({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }) as RecordData,
    { merge: true },
  );
  return getAdminRecord(collectionName, id);
}
