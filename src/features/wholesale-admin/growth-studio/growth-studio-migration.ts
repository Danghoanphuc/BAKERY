import { randomUUID } from "node:crypto";
import type { GrowthCheckpoint, GrowthStudioWorkspace, GrowthWorkspaceRevision } from "./growth-studio-contract";
import { normalizeGrowthWorkspace } from "./growth-studio-domain";

export type GrowthLegacyMigration = {
  workspace: GrowthStudioWorkspace;
  revision: GrowthWorkspaceRevision;
  checkpoint: GrowthCheckpoint;
  beforeSnapshot: GrowthStudioWorkspace;
  counts: { workspaces: 1; nodes: number; revisions: 1 };
};

export function migrateLegacyGrowthWorkspace(input: GrowthStudioWorkspace, now = new Date().toISOString()): GrowthLegacyMigration {
  const beforeSnapshot = JSON.parse(JSON.stringify(input)) as GrowthStudioWorkspace;
  const revisionId = randomUUID();
  const checkpointId = randomUUID();
  const normalized = normalizeGrowthWorkspace({
    ...input,
    currentRevisionId: revisionId,
    currentCheckpointId: checkpointId,
    updatedAt: input.updatedAt || now,
  });
  const revision: GrowthWorkspaceRevision = {
    id: revisionId,
    workspaceId: normalized.id,
    kind: "migration",
    snapshot: normalized,
    createdBy: "migration:growth-studio-v2",
    createdAt: now,
  };
  const checkpoint: GrowthCheckpoint = {
    id: checkpointId,
    workspaceId: normalized.id,
    name: "Imported from legacy workspace",
    snapshot: normalized,
    sourceRevisionId: revisionId,
    createdBy: "migration:growth-studio-v2",
    createdAt: now,
  };
  return {
    workspace: normalized,
    revision,
    checkpoint,
    beforeSnapshot,
    counts: { workspaces: 1, nodes: normalized.nodes.length, revisions: 1 },
  };
}
