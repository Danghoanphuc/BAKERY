import { createHash, randomBytes } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { AuthenticatorTransportFuture, CredentialDeviceType } from "@simplewebauthn/server";

import { getAdminFirestore } from "./admin";

const PASSKEYS_COLLECTION = "customer_passkeys";
const CHALLENGES_COLLECTION = "passkey_challenges";

export type StoredPasskey = {
  id: string;
  customerId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
};

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    const converter = value as { toDate?: () => Date };
    if (converter.toDate) return converter.toDate();
  }
  return new Date(0);
}

function normalizePasskey(id: string, data: Record<string, unknown>): StoredPasskey {
  return {
    id,
    customerId: String(data.customerId ?? ""),
    credentialId: String(data.credentialId ?? ""),
    publicKey: String(data.publicKey ?? ""),
    counter: typeof data.counter === "number" ? data.counter : 0,
    transports: Array.isArray(data.transports)
      ? (data.transports as AuthenticatorTransportFuture[])
      : undefined,
    deviceType: data.deviceType === "singleDevice" ? "singleDevice" : "multiDevice",
    backedUp: data.backedUp === true,
    name: String(data.name ?? "Passkey"),
    createdAt: toDate(data.createdAt),
    lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
  };
}

function passkeyDocId(credentialId: string) {
  return createHash("sha256").update(credentialId).digest("hex");
}

export async function listCustomerPasskeys(customerId: string) {
  const snapshot = await getAdminFirestore()
    .collection(PASSKEYS_COLLECTION)
    .where("customerId", "==", customerId)
    .get();
  return snapshot.docs
    .map((doc) => normalizePasskey(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getPasskeyByCredentialId(credentialId: string) {
  const snapshot = await getAdminFirestore()
    .collection(PASSKEYS_COLLECTION)
    .doc(passkeyDocId(credentialId))
    .get();
  return snapshot.exists ? normalizePasskey(snapshot.id, snapshot.data() ?? {}) : null;
}

export async function saveCustomerPasskey(input: Omit<StoredPasskey, "id" | "createdAt">) {
  const now = Timestamp.now();
  await getAdminFirestore()
    .collection(PASSKEYS_COLLECTION)
    .doc(passkeyDocId(input.credentialId))
    .set({
      customerId: input.customerId,
      credentialId: input.credentialId,
      publicKey: input.publicKey,
      counter: input.counter,
      ...(input.transports ? { transports: input.transports } : {}),
      deviceType: input.deviceType,
      backedUp: input.backedUp,
      name: input.name,
      createdAt: now,
    });
}

export async function updatePasskeyUsage(id: string, counter: number) {
  await getAdminFirestore().collection(PASSKEYS_COLLECTION).doc(id).update({
    counter,
    lastUsedAt: Timestamp.now(),
  });
}

export async function deleteCustomerPasskey(customerId: string, id: string) {
  const ref = getAdminFirestore().collection(PASSKEYS_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.customerId !== customerId) return false;
  await ref.delete();
  return true;
}

export async function createPasskeyChallenge(input: {
  challenge: string;
  purpose: "registration" | "authentication";
  customerId?: string;
}) {
  const rawId = randomBytes(24).toString("base64url");
  const id = createHash("sha256").update(rawId).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await getAdminFirestore().collection(CHALLENGES_COLLECTION).doc(id).set({
    challenge: input.challenge,
    purpose: input.purpose,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    deleteAfter: Timestamp.fromDate(new Date(expiresAt.getTime() + 86_400_000)),
  });
  return rawId;
}

export async function consumePasskeyChallenge(rawId: string) {
  const id = createHash("sha256").update(rawId).digest("hex");
  const db = getAdminFirestore();
  const ref = db.collection(CHALLENGES_COLLECTION).doc(id);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    transaction.delete(ref);
    if (toDate(data.expiresAt).getTime() <= Date.now()) return null;
    return {
      challenge: String(data.challenge ?? ""),
      purpose: data.purpose as "registration" | "authentication",
      customerId: typeof data.customerId === "string" ? data.customerId : undefined,
    };
  });
}
