import type { GrowthStaleReason, GrowthStudioWorkspace } from "./growth-studio-contract";
import { getDescendantNodeIds, refreshGrowthNodeAvailability } from "./growth-studio-template";

export function invalidateGrowthDependencies(
  workspace: GrowthStudioWorkspace,
  sourceNodeId: string,
  reason: Omit<GrowthStaleReason, "detectedAt" | "sourceNodeId">,
) {
  const descendants = getDescendantNodeIds(workspace.nodes, workspace.edges, sourceNodeId);
  const detectedAt = new Date().toISOString();
  const nodes = workspace.nodes.map((node) => {
    if (!descendants.has(node.id)) return node;
    const staleReason: GrowthStaleReason = { ...reason, sourceNodeId, detectedAt };
    return {
      ...node,
      status: node.artifact ? "stale" as const : "locked" as const,
      staleReasons: [...(node.staleReasons || []).filter((item) => item.code !== reason.code || item.sourceNodeId !== sourceNodeId), staleReason],
      error: undefined,
    };
  });
  return {
    ...workspace,
    nodes: refreshGrowthNodeAvailability(nodes),
    status: "stale" as const,
    approvedAt: undefined,
    updatedAt: detectedAt,
  };
}
