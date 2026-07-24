import { describe, expect, it } from "vitest";
import { createGrowthStudioWorkspace } from "./growth-studio-template";
import { migrateLegacyGrowthWorkspace } from "./growth-studio-migration";

describe("Growth Studio legacy migration", () => {
  it("preserves canvas data and creates an import checkpoint", () => {
    const legacy = createGrowthStudioWorkspace();
    legacy.nodes[0].position = { x: 777, y: 888 };
    const result = migrateLegacyGrowthWorkspace(legacy, "2026-07-20T00:00:00.000Z");
    expect(result.workspace.nodes).toHaveLength(1);
    expect(result.workspace.nodes[0].position).toEqual({ x: 777, y: 888 });
    expect(result.checkpoint.name).toBe("Imported from legacy workspace");
    expect(result.revision.kind).toBe("migration");
    expect(result.counts).toEqual({ workspaces: 1, nodes: 1, revisions: 1 });
  });

  it("does not invent a missing segment id", () => {
    const result = migrateLegacyGrowthWorkspace(createGrowthStudioWorkspace());
    expect(result.workspace.context?.segmentId).toBeUndefined();
    expect(result.workspace.context?.status).toBe("needs_confirmation");
  });
});
