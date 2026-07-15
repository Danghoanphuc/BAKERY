import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./config";
import type { LoyaltyAuditEntry, LoyaltyPointLedgerEntry, LoyaltyProgramVersion, LoyaltyReward, LoyaltyRule, LoyaltySegment } from "@/types";

const collections = {
  ledger: "loyalty_point_ledger",
  versions: "loyalty_program_versions",
  rules: "loyalty_rules",
  rewards: "loyalty_rewards",
  segments: "loyalty_segments",
  audit: "loyalty_audit_logs",
} as const;

function date(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) return (value as { toDate: () => Date }).toDate();
  return new Date(typeof value === "string" || typeof value === "number" ? value : 0);
}

async function list(name: string) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item): Record<string, unknown> & { id: string } => ({ id: item.id, ...item.data() }));
}

export async function getLoyaltyWorkspaceData() {
  const [rulesRaw, rewardsRaw, segmentsRaw, versionsRaw, ledgerRaw, auditRaw] = await Promise.all([
    list(collections.rules), list(collections.rewards), list(collections.segments),
    list(collections.versions), list(collections.ledger), list(collections.audit),
  ]);
  const rules = rulesRaw as unknown as LoyaltyRule[];
  const rewards = rewardsRaw as unknown as LoyaltyReward[];
  const segments = segmentsRaw as unknown as LoyaltySegment[];
  const versions = versionsRaw.map((item) => ({ ...item, createdAt: date(item.createdAt), activatedAt: item.activatedAt ? date(item.activatedAt) : undefined })) as unknown as LoyaltyProgramVersion[];
  const ledger = ledgerRaw.map((item) => ({ ...item, createdAt: date(item.createdAt), expiresAt: item.expiresAt ? date(item.expiresAt) : undefined })) as unknown as LoyaltyPointLedgerEntry[];
  const audit = auditRaw.map((item) => ({ ...item, createdAt: date(item.createdAt) })) as unknown as LoyaltyAuditEntry[];
  return { rules, rewards, segments, versions: versions.sort((a, b) => b.version - a.version), ledger, audit: audit.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50) };
}

type EntityKind = "rule" | "reward" | "segment";
const entityCollection = { rule: collections.rules, reward: collections.rewards, segment: collections.segments } as const;

export async function saveLoyaltyEntity(kind: EntityKind, value: Record<string, unknown>, actor = "admin") {
  const id = typeof value.id === "string" && value.id ? value.id : crypto.randomUUID();
  const payload = { ...value, id, updatedAt: serverTimestamp() };
  await setDoc(doc(db, entityCollection[kind], id), payload, { merge: true });
  await addDoc(collection(db, collections.audit), { action: "saved", entityType: kind, entityId: id, actor, createdAt: serverTimestamp() });
  return { ...value, id };
}

export async function createLoyaltyVersion(snapshot: Record<string, unknown>, name: string, note?: string, actor = "admin") {
  const existing = await list(collections.versions);
  const version = Math.max(0, ...existing.map((item) => typeof item.version === "number" ? item.version : 0)) + 1;
  const ref = await addDoc(collection(db, collections.versions), {
    version, name, note: note || "", status: "draft", snapshot, createdAt: serverTimestamp(), actor,
  });
  await addDoc(collection(db, collections.audit), { action: "version_created", entityType: "version", entityId: ref.id, actor, metadata: { version }, createdAt: serverTimestamp() });
  return { id: ref.id, version };
}

export async function activateLoyaltyVersion(id: string, actor = "admin") {
  const versions = await list(collections.versions);
  const selected = versions.find((item) => item.id === id);
  if (!selected) throw new Error("LOYALTY_VERSION_NOT_FOUND");
  await Promise.all(versions.map((item) => setDoc(doc(db, collections.versions, item.id), {
    status: item.id === id ? "active" : item.status === "active" ? "superseded" : item.status,
    ...(item.id === id ? { activatedAt: serverTimestamp() } : {}),
  }, { merge: true })));
  await addDoc(collection(db, collections.audit), { action: "version_activated", entityType: "version", entityId: id, actor, createdAt: serverTimestamp() });
  return selected.snapshot as Record<string, unknown> | undefined;
}

export async function appendPointLedgerEntry(input: Omit<LoyaltyPointLedgerEntry, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, collections.ledger), {
    ...input,
    expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
