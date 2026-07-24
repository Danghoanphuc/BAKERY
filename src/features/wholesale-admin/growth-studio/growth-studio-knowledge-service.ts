import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { GrowthEvidence, GrowthKnowledgeObject, GrowthKnowledgeStatus } from "./growth-studio-contract";

const KNOWLEDGE = "growth_studio_knowledge_objects";
const EVIDENCE = "growth_studio_evidence";

export type KnowledgeProposal = Omit<GrowthKnowledgeObject, "id" | "currentRevisionId" | "updatedAt"> & {
  proposedBy: string;
};

export async function proposeGrowthKnowledge(input: KnowledgeProposal) {
  const db = getAdminFirestore();
  const id = randomUUID();
  const revisionId = randomUUID();
  const object: GrowthKnowledgeObject = {
    id, type: input.type, title: input.title, data: input.data,
    status: "hypothesis", confidence: input.confidence, currentRevisionId: revisionId,
    evidenceRefs: input.evidenceRefs, workspaceIds: input.workspaceIds,
    ...(input.effectiveFrom ? { effectiveFrom: input.effectiveFrom } : {}),
    ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}),
    updatedAt: new Date().toISOString(),
  };
  const ref = db.collection(KNOWLEDGE).doc(id);
  const batch = db.batch();
  batch.create(ref, { ...object, updatedAt: FieldValue.serverTimestamp(), approvalStatus: "pending", proposedBy: input.proposedBy });
  batch.create(ref.collection("revisions").doc(revisionId), { object, createdBy: input.proposedBy, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return object;
}

export async function approveGrowthKnowledge(input: { objectId: string; status: Exclude<GrowthKnowledgeStatus, "hypothesis">; approvedBy: string }) {
  const ref = getAdminFirestore().collection(KNOWLEDGE).doc(input.objectId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("GROWTH_KNOWLEDGE_NOT_FOUND");
  await ref.set({ status: input.status, approvalStatus: "approved", approvedBy: input.approvedBy, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function createGrowthEvidence(input: Omit<GrowthEvidence, "id" | "capturedAt">) {
  const id = randomUUID();
  const evidence: GrowthEvidence = { ...input, id, capturedAt: new Date().toISOString() };
  await getAdminFirestore().collection(EVIDENCE).doc(id).create({ ...evidence, capturedAt: FieldValue.serverTimestamp() });
  return evidence;
}

export async function listKnowledgeForWorkspace(workspaceId: string) {
  const snapshot = await getAdminFirestore().collection(KNOWLEDGE).where("workspaceIds", "array-contains", workspaceId).limit(100).get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as GrowthKnowledgeObject));
}
