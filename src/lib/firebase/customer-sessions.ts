import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "./admin";

const CUSTOMER_SESSIONS_COLLECTION = "customer_sessions";

export type StoredCustomerSession = {
  id: string;
  customerId: string;
  deviceLabel: string;
  userAgent: string;
  ipHash?: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
};

type CreateCustomerSessionInput = Omit<StoredCustomerSession, "id">;

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }
  return new Date(0);
}

function normalizeSession(
  id: string,
  data: Record<string, unknown>,
): StoredCustomerSession {
  return {
    id,
    customerId: String(data.customerId ?? ""),
    deviceLabel: String(data.deviceLabel ?? "Thiết bị không xác định"),
    userAgent: String(data.userAgent ?? ""),
    ipHash: typeof data.ipHash === "string" ? data.ipHash : undefined,
    createdAt: toDate(data.createdAt),
    lastSeenAt: toDate(data.lastSeenAt),
    expiresAt: toDate(data.expiresAt),
    revokedAt: data.revokedAt ? toDate(data.revokedAt) : undefined,
  };
}

function sessionsCollection() {
  return getAdminFirestore().collection(CUSTOMER_SESSIONS_COLLECTION);
}

export async function createStoredCustomerSession(
  id: string,
  input: CreateCustomerSessionInput,
) {
  await sessionsCollection().doc(id).set({
    customerId: input.customerId,
    deviceLabel: input.deviceLabel,
    userAgent: input.userAgent,
    ...(input.ipHash ? { ipHash: input.ipHash } : {}),
    createdAt: Timestamp.fromDate(input.createdAt),
    lastSeenAt: Timestamp.fromDate(input.lastSeenAt),
    expiresAt: Timestamp.fromDate(input.expiresAt),
  });
  await enforceStoredCustomerSessionLimit(input.customerId, id);
}

async function enforceStoredCustomerSessionLimit(
  customerId: string,
  currentSessionId: string,
  maxActiveSessions = 8,
) {
  const now = Date.now();
  const active = (await listStoredCustomerSessions(customerId)).filter(
    (session) => !session.revokedAt && session.expiresAt.getTime() > now,
  );
  if (active.length <= maxActiveSessions) return;

  const toRevoke = active
    .filter((session) => session.id !== currentSessionId)
    .sort((left, right) => left.lastSeenAt.getTime() - right.lastSeenAt.getTime())
    .slice(0, active.length - maxActiveSessions);
  if (toRevoke.length === 0) return;

  const db = getAdminFirestore();
  const batch = db.batch();
  const revokedAt = Timestamp.now();
  toRevoke.forEach((session) => {
    batch.update(sessionsCollection().doc(session.id), { revokedAt });
  });
  await batch.commit();
}

export async function getStoredCustomerSession(id: string) {
  const snapshot = await sessionsCollection().doc(id).get();
  return snapshot.exists
    ? normalizeSession(snapshot.id, snapshot.data() ?? {})
    : null;
}

export async function touchStoredCustomerSession(id: string, at: Date) {
  await sessionsCollection().doc(id).update({
    lastSeenAt: Timestamp.fromDate(at),
  });
}

export async function listStoredCustomerSessions(customerId: string) {
  const snapshot = await sessionsCollection()
    .where("customerId", "==", customerId)
    .get();

  return snapshot.docs
    .map((sessionDoc) =>
      normalizeSession(sessionDoc.id, sessionDoc.data()),
    )
    .sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime());
}

export async function revokeStoredCustomerSession(id: string, at = new Date()) {
  await sessionsCollection().doc(id).update({
    revokedAt: Timestamp.fromDate(at),
  });
}

export async function revokeOtherStoredCustomerSessions(
  customerId: string,
  currentSessionId: string,
) {
  const sessions = await listStoredCustomerSessions(customerId);
  const activeOthers = sessions.filter(
    (session) => session.id !== currentSessionId && !session.revokedAt,
  );
  if (activeOthers.length === 0) return 0;

  const db = getAdminFirestore();
  const batch = db.batch();
  const revokedAt = Timestamp.now();
  activeOthers.forEach((session) => {
    batch.update(sessionsCollection().doc(session.id), { revokedAt });
  });
  await batch.commit();
  return activeOthers.length;
}
