import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  GrowthCheckpoint,
  GrowthHistory,
  GrowthNodeArtifact,
  GrowthNodeRun,
  GrowthOutputRevision,
  GrowthRelease,
  GrowthStudioProduct,
  GrowthStudioWorkspace,
  GrowthWorkspaceRevision,
} from "./growth-studio-contract";
import { createGrowthStudioNode, createGrowthStudioWorkspace } from "./growth-studio-template";
import { canReleaseGrowthWorkspace, normalizeGrowthWorkspace } from "./growth-studio-domain";
import { GROWTH_WORKSPACE_TEMPLATES } from "./growth-studio-domain";
import type { GrowthWorkspaceTemplateId } from "./growth-studio-contract";

const WORKSPACES = "growth_studio_workspaces";
const PRODUCTS = "products";
const REVISIONS = "revisions";
const RUNS = "runs";
const CHECKPOINTS = "checkpoints";
const RELEASES = "releases";
const OUTPUT_REVISIONS = "output_revisions";

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function productFromData(id: string, data: Record<string, unknown>): GrowthStudioProduct {
  const sweetnessLevel = ["low", "medium", "high"].includes(String(data.sweetnessLevel))
    ? (data.sweetnessLevel as GrowthStudioProduct["sweetnessLevel"])
    : undefined;
  return {
    id,
    name: optionalText(data.name) || "Sản phẩm chưa đặt tên",
    imageUrl: optionalText(data.imageUrl) || "",
    categoryId: optionalText(data.categoryId),
    shortDescription: optionalText(data.shortDescription),
    description: optionalText(data.description),
    sellingPoints: stringList(data.sellingPoints),
    ingredients: stringList(data.ingredients),
    allergens: stringList(data.allergens),
    dietaryTags: stringList(data.dietaryTags),
    occasionTags: stringList(data.occasionTags),
    servingSuggestion: optionalText(data.servingSuggestion),
    servingSize: optionalText(data.servingSize),
    sweetnessLevel,
    price: typeof data.price === "number" && Number.isFinite(data.price) ? data.price : undefined,
  };
}

function dateValue(value: unknown, fallback = new Date().toISOString()) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return fallback;
}

function workspaceFromData(id: string, data: Record<string, unknown>): GrowthStudioWorkspace {
  const workspace = {
    ...(data as unknown as GrowthStudioWorkspace),
    id,
    createdAt: dateValue(data.createdAt),
    updatedAt: dateValue(data.updatedAt),
    ...(data.approvedAt ? { approvedAt: dateValue(data.approvedAt) } : {}),
    ...(data.archivedAt ? { archivedAt: dateValue(data.archivedAt) } : {}),
  };
  if (!Array.isArray(workspace.nodes) || !workspace.nodes.length) workspace.nodes = [createGrowthStudioNode("customer_profile")];
  if (!Array.isArray(workspace.edges)) workspace.edges = [];
  return normalizeGrowthWorkspace(workspace);
}

function historyItem<T>(doc: QueryDocumentSnapshot<DocumentData>) {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: dateValue(data.createdAt),
    startedAt: data.startedAt ? dateValue(data.startedAt) : undefined,
    completedAt: data.completedAt ? dateValue(data.completedAt) : undefined,
    publishedAt: data.publishedAt ? dateValue(data.publishedAt) : undefined,
  } as T;
}

export async function listGrowthStudioProducts() {
  const snapshot = await getAdminFirestore().collection(PRODUCTS).limit(120).get();
  return snapshot.docs.map((doc) => productFromData(doc.id, doc.data())).sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export async function getGrowthStudioProduct(productId: string) {
  const doc = await getAdminFirestore().collection(PRODUCTS).doc(productId).get();
  return doc.exists ? productFromData(doc.id, doc.data() || {}) : null;
}

export async function listGrowthStudioWorkspaces() {
  const snapshot = await getAdminFirestore().collection(WORKSPACES).orderBy("updatedAt", "desc").limit(80).get();
  return snapshot.docs.map((doc) => workspaceFromData(doc.id, doc.data()));
}

export async function getGrowthStudioWorkspace(workspaceId: string) {
  const doc = await getAdminFirestore().collection(WORKSPACES).doc(workspaceId).get();
  return doc.exists ? workspaceFromData(doc.id, doc.data() || {}) : null;
}

export async function createAndPersistGrowthStudioWorkspace(input?: { title?: string; description?: string; templateId?: GrowthWorkspaceTemplateId }) {
  const template = GROWTH_WORKSPACE_TEMPLATES.find((candidate) => candidate.id === input?.templateId)
    || GROWTH_WORKSPACE_TEMPLATES[GROWTH_WORKSPACE_TEMPLATES.length - 1];
  if (!template) throw new Error("GROWTH_TEMPLATE_NOT_FOUND");
  const workspace = normalizeGrowthWorkspace({
    ...createGrowthStudioWorkspace(),
    title: input?.title?.trim().slice(0, 120) || template.label,
    description: input?.description?.trim().slice(0, 240) || template.description,
    workspaceType: template.type,
    templateId: template.id,
  });
  const docRef = getAdminFirestore().collection(WORKSPACES).doc(workspace.id);
  const revisionId = randomUUID();
  const revision: GrowthWorkspaceRevision = {
    id: revisionId, workspaceId: workspace.id, kind: "manual", snapshot: workspace,
    createdBy: "admin", createdAt: workspace.createdAt,
  };
  const batch = getAdminFirestore().batch();
  batch.set(docRef, { ...clean({ ...workspace, currentRevisionId: revisionId }), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.set(docRef.collection(REVISIONS).doc(revisionId), { ...clean(revision), createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { ...workspace, currentRevisionId: revisionId };
}

export async function saveGrowthStudioWorkspace(workspaceInput: GrowthStudioWorkspace, kind: GrowthWorkspaceRevision["kind"] = "autosave") {
  const workspace = normalizeGrowthWorkspace(workspaceInput);
  const db = getAdminFirestore();
  const docRef = db.collection(WORKSPACES).doc(workspace.id);
  const revisionId = randomUUID();
  const now = new Date().toISOString();
  return db.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(docRef);
    const parentRevisionId = optionalText(currentDoc.data()?.currentRevisionId) || workspace.currentRevisionId;
    const currentArchivedAt = optionalText(currentDoc.data()?.archivedAt);
    const archivedAt = kind === "autosave" ? workspace.archivedAt || currentArchivedAt : workspace.archivedAt;
    const next = {
      ...workspace,
      ...(archivedAt ? { archivedAt } : {}),
      currentRevisionId: revisionId,
      updatedAt: now,
    };
    const revision: GrowthWorkspaceRevision = {
      id: revisionId, workspaceId: workspace.id, kind, snapshot: next,
      ...(parentRevisionId ? { parentRevisionId } : {}),
      createdBy: "admin", createdAt: now,
    };
    transaction.set(docRef, {
      ...clean(next),
      approvedAt: workspace.approvedAt || FieldValue.delete(),
      archivedAt: archivedAt || FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(docRef.collection(REVISIONS).doc(revisionId), { ...clean(revision), createdAt: FieldValue.serverTimestamp() });
    return next;
  });
}

export async function updateGrowthStudioWorkspaceMetadata(
  workspaceId: string,
  input: { title: string; description?: string },
) {
  const workspace = await getGrowthStudioWorkspace(workspaceId);
  if (!workspace) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new Error("GROWTH_WORKSPACE_TITLE_REQUIRED");
  return saveGrowthStudioWorkspace({
    ...workspace,
    title,
    description: input.description?.trim().slice(0, 240) || "",
    updatedAt: new Date().toISOString(),
  }, "manual");
}

export async function setGrowthStudioWorkspaceArchived(workspaceId: string, archived: boolean) {
  const workspace = await getGrowthStudioWorkspace(workspaceId);
  if (!workspace) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  return saveGrowthStudioWorkspace({
    ...workspace,
    ...(archived ? { archivedAt: new Date().toISOString() } : {}),
    ...(!archived ? { archivedAt: undefined } : {}),
    updatedAt: new Date().toISOString(),
  }, "manual");
}

export async function listGrowthStudioHistory(workspaceId: string): Promise<GrowthHistory> {
  const ref = getAdminFirestore().collection(WORKSPACES).doc(workspaceId);
  const [revisionDocs, runDocs, checkpointDocs, releaseDocs] = await Promise.all([
    ref.collection(REVISIONS).orderBy("createdAt", "desc").limit(80).get(),
    ref.collection(RUNS).orderBy("startedAt", "desc").limit(80).get(),
    ref.collection(CHECKPOINTS).orderBy("createdAt", "desc").limit(40).get(),
    ref.collection(RELEASES).orderBy("publishedAt", "desc").limit(40).get(),
  ]);
  return {
    revisions: revisionDocs.docs.map((doc) => historyItem<GrowthWorkspaceRevision>(doc)),
    runs: runDocs.docs.map((doc) => historyItem<GrowthNodeRun>(doc)),
    checkpoints: checkpointDocs.docs.map((doc) => historyItem<GrowthCheckpoint>(doc)),
    releases: releaseDocs.docs.map((doc) => historyItem<GrowthRelease>(doc)),
  };
}

export async function createGrowthStudioCheckpoint(workspaceId: string, name: string) {
  const workspace = await getGrowthStudioWorkspace(workspaceId);
  if (!workspace) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  const id = randomUUID();
  const checkpoint: GrowthCheckpoint = {
    id, workspaceId, name: name.trim().slice(0, 120) || "Checkpoint không tên",
    snapshot: workspace, sourceRevisionId: workspace.currentRevisionId, createdBy: "admin", createdAt: new Date().toISOString(),
  };
  const ref = getAdminFirestore().collection(WORKSPACES).doc(workspaceId);
  const batch = getAdminFirestore().batch();
  batch.set(ref.collection(CHECKPOINTS).doc(id), { ...clean(checkpoint), createdAt: FieldValue.serverTimestamp() });
  batch.set(ref, { currentCheckpointId: id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  return checkpoint;
}

export async function restoreGrowthStudioRevision(workspaceId: string, revisionId: string) {
  const ref = getAdminFirestore().collection(WORKSPACES).doc(workspaceId);
  const revisionDoc = await ref.collection(REVISIONS).doc(revisionId).get();
  if (!revisionDoc.exists) throw new Error("GROWTH_REVISION_NOT_FOUND");
  const old = revisionDoc.data() as GrowthWorkspaceRevision;
  const current = await getGrowthStudioWorkspace(workspaceId);
  if (!current) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  const restored = normalizeGrowthWorkspace({
    ...clean(old.snapshot), id: workspaceId, createdAt: current.createdAt,
    currentRevisionId: current.currentRevisionId, updatedAt: new Date().toISOString(),
  });
  const saved = await saveGrowthStudioWorkspace(restored, "restore");
  await ref.collection(REVISIONS).doc(saved.currentRevisionId!).set({ restoredFromRevisionId: revisionId }, { merge: true });
  return saved;
}

export async function createGrowthStudioRelease(workspaceId: string) {
  const workspace = await getGrowthStudioWorkspace(workspaceId);
  if (!workspace) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  const eligibility = canReleaseGrowthWorkspace(workspace);
  if (!eligibility.allowed) throw new Error(`GROWTH_RELEASE_BLOCKED:${eligibility.errors.join("|")}`);
  const ref = getAdminFirestore().collection(WORKSPACES).doc(workspaceId);
  const previous = await ref.collection(RELEASES).orderBy("publishedAt", "desc").limit(1).get();
  const lastNumber = previous.empty ? 0 : Number(String(previous.docs[0].data().version || "0").replace(/^v/, "")) || 0;
  const version = `v${lastNumber + 1}`;
  const id = randomUUID();
  const release: GrowthRelease = {
    id, workspaceId, version, immutableSnapshot: workspace, approvedBy: "admin",
    publishedAt: new Date().toISOString(), externalReferences: [],
  };
  const batch = getAdminFirestore().batch();
  batch.create(ref.collection(RELEASES).doc(id), { ...clean(release), publishedAt: FieldValue.serverTimestamp() });
  batch.set(ref, { currentReleaseVersion: version, status: "released", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  return release;
}

export async function startGrowthStudioRun(run: GrowthNodeRun) {
  const ref = getAdminFirestore().collection(WORKSPACES).doc(run.workspaceId).collection(RUNS).doc(run.id);
  await ref.create({ ...clean(run), startedAt: FieldValue.serverTimestamp() });
}

export async function failGrowthStudioRun(run: GrowthNodeRun, error: string) {
  await getAdminFirestore().collection(WORKSPACES).doc(run.workspaceId).collection(RUNS).doc(run.id).set({
    status: "failed", error: error.slice(0, 1000), completedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function completeGrowthStudioRun(run: GrowthNodeRun, artifact: GrowthNodeArtifact) {
  const workspace = await getGrowthStudioWorkspace(run.workspaceId);
  if (!workspace) throw new Error("GROWTH_WORKSPACE_NOT_FOUND");
  const node = workspace.nodes.find((candidate) => candidate.id === run.nodeId);
  if (!node) throw new Error("GROWTH_NODE_NOT_FOUND");
  const outputRevisionId = randomUUID();
  const now = new Date().toISOString();
  const outputRevision: GrowthOutputRevision = {
    id: outputRevisionId, workspaceId: run.workspaceId, nodeId: run.nodeId,
    parentRevisionId: node.currentDraftRevisionId, runId: run.id, artifact,
    upstreamRevisionIds: run.upstreamRevisionIds, knowledgeObjectRevisionIds: run.knowledgeObjectRevisionIds,
    createdBy: `ai:${run.modelId}`, createdAt: now,
  };
  const next = {
    ...workspace,
    nodes: workspace.nodes.map((candidate) => candidate.id === node.id ? {
      ...candidate, artifact, currentDraftRevisionId: outputRevisionId, status: "needs_review" as const,
      staleReasons: [], error: undefined,
    } : candidate),
    status: "in_review" as const,
    updatedAt: now,
  };
  const workspaceRef = getAdminFirestore().collection(WORKSPACES).doc(run.workspaceId);
  const batch = getAdminFirestore().batch();
  batch.create(workspaceRef.collection(OUTPUT_REVISIONS).doc(outputRevisionId), { ...clean(outputRevision), createdAt: FieldValue.serverTimestamp() });
  batch.set(workspaceRef.collection(RUNS).doc(run.id), {
    status: "completed", output: clean(artifact), outputRevisionId, completedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(workspaceRef, { ...clean(next), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  return { workspace: next, outputRevisionId };
}
