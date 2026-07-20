import { createHash, randomUUID } from "node:crypto";
import type { GrowthNodeRun, GrowthStudioWorkspace } from "./growth-studio-contract";
import { contextForNode, normalizeGrowthWorkspace } from "./growth-studio-domain";
import { getGrowthAiModel, getGrowthNodeAiModel } from "./growth-studio-models";
import { GROWTH_NODE_DEFINITIONS } from "./growth-studio-template";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function hashGrowthNodeInput(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex");
}

export function buildGrowthNodeRun(workspaceInput: GrowthStudioWorkspace, nodeId: string): GrowthNodeRun {
  const workspace = normalizeGrowthWorkspace(workspaceInput);
  const node = workspace.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error("GROWTH_NODE_NOT_FOUND");
  const definition = GROWTH_NODE_DEFINITIONS[node.type];
  const modelId = getGrowthNodeAiModel(node);
  const upstream = workspace.edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
  const upstreamNodes = workspace.nodes.filter((candidate) => upstream.includes(candidate.id));
  const upstreamRevisionIds = upstreamNodes.flatMap((candidate) => candidate.approvedOutputRevisionId ? [candidate.approvedOutputRevisionId] : []);
  const inputSnapshot = {
    context: contextForNode(workspace, node),
    product: workspace.product || null,
    upstream: upstreamNodes.map((candidate) => ({
      nodeId: candidate.id,
      nodeType: candidate.type,
      revisionId: candidate.approvedOutputRevisionId || null,
      artifact: candidate.artifact || null,
    })),
    currentArtifact: node.artifact || null,
  };
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    ...contextForNode(workspace, node),
    upstreamRevisionIds,
    knowledgeObjectRevisionIds: [],
    modelId,
    modelConfig: getGrowthAiModel(modelId).config,
    promptVersion: definition.promptVersion,
    inputSnapshot,
    inputHash: hashGrowthNodeInput(inputSnapshot),
    status: "running",
    startedAt: now,
  };
}
