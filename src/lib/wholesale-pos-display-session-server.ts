import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import { db } from "@/lib/wholesale-firebase/app";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import type { PosDisplaySnapshot } from "@/store/posDisplayStore";

const COLLECTION = "pos_display_sessions";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function hasExplicitAdminCredentials() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  );
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    const converter = value as { toDate?: () => Date };
    if (typeof converter.toDate === "function") return converter.toDate();
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashToken(token));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createPosDisplaySession() {
  const sessionId = randomUUID();
  const displayToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const payload = {
    displayTokenHash: hashToken(displayToken),
    createdAt: now,
    updatedAt: now,
    expiresAt,
    snapshot: null,
  };
  if (hasExplicitAdminCredentials()) {
    await getAdminFirestore().collection(COLLECTION).doc(sessionId).set(payload);
  } else {
    await setDoc(doc(db, COLLECTION, sessionId), payload);
  }

  return { sessionId, displayToken, expiresAt: expiresAt.toISOString() };
}

export async function updatePosDisplaySession(
  sessionId: string,
  snapshot: Omit<PosDisplaySnapshot, "updatedAt">,
) {
  const useAdmin = hasExplicitAdminCredentials();
  const adminRef = useAdmin
    ? getAdminFirestore().collection(COLLECTION).doc(sessionId)
    : null;
  const clientRef = doc(db, COLLECTION, sessionId);
  let data: Record<string, unknown> | undefined;
  if (adminRef) {
    const existing = await adminRef.get();
    if (!existing.exists) return null;
    data = existing.data();
  } else {
    const existing = await getDoc(clientRef);
    if (!existing.exists()) return null;
    data = existing.data();
  }
  const expiresAt = toDate(data?.expiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) return null;

  const updatedAt = new Date().toISOString();
  const nextSnapshot: PosDisplaySnapshot = { ...snapshot, updatedAt };
  if (adminRef) {
    await adminRef.update({ snapshot: nextSnapshot, updatedAt: new Date() });
  } else {
    await updateDoc(clientRef, { snapshot: nextSnapshot, updatedAt: new Date() });
  }
  return nextSnapshot;
}

export async function readPosDisplaySession(
  sessionId: string,
  displayToken: string,
) {
  let data: Record<string, unknown> | undefined;
  if (hasExplicitAdminCredentials()) {
    const snapshot = await getAdminFirestore()
      .collection(COLLECTION)
      .doc(sessionId)
      .get();
    if (!snapshot.exists) return null;
    data = snapshot.data();
  } else {
    const snapshot = await getDoc(doc(db, COLLECTION, sessionId));
    if (!snapshot.exists()) return null;
    data = snapshot.data();
  }
  const expiresAt = toDate(data?.expiresAt);
  if (
    !expiresAt ||
    expiresAt.getTime() <= Date.now() ||
    typeof data?.displayTokenHash !== "string" ||
    !tokenMatches(displayToken, data.displayTokenHash)
  ) {
    return null;
  }

  return {
    snapshot: (data.snapshot as PosDisplaySnapshot | null) ?? null,
    expiresAt: expiresAt.toISOString(),
  };
}

export function isPosDisplaySnapshotInput(
  value: unknown,
): value is Omit<PosDisplaySnapshot, "updatedAt"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PosDisplaySnapshot>;
  return (
    ["idle", "editing", "awaiting_payment", "paid", "thank_you"].includes(
      item.status ?? "",
    ) &&
    Array.isArray(item.items) &&
    item.items.length <= 100 &&
    Number.isFinite(item.subtotal) &&
    Number.isFinite(item.discountAmount) &&
    Number.isFinite(item.totalAmount)
  );
}
