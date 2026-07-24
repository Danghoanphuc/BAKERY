import { describe, expect, it } from "vitest";
import type { GrowthStudioWorkspace } from "./growth-studio-contract";
import { createGrowthStudioNode, createGrowthStudioWorkspace } from "./growth-studio-template";
import { normalizeGrowthWorkspace, validateGrowthWorkspaceContext } from "./growth-studio-domain";
import { invalidateGrowthDependencies } from "./growth-studio-invalidation-service";
import { hashGrowthNodeInput } from "./growth-studio-node-run-service";

function completeWorkspace(): GrowthStudioWorkspace {
  const base = createGrowthStudioWorkspace();
  return {
    ...base,
    context: { customerProfileId: "profile-1", segmentId: "segment-1", productId: "product-1", status: "resolved" },
    product: { id: "product-1", name: "Panna cotta", imageUrl: "", sellingPoints: [], ingredients: [], allergens: [], dietaryTags: [], occasionTags: [] },
    nodes: ["customer_profile", "jobs_pains_gains", "real_needs", "value_proposition", "product_plan", "image_intervention", "product_content", "social_preview", "approval"].map((type) => ({
      ...createGrowthStudioNode(type as GrowthStudioWorkspace["nodes"][number]["type"]),
      status: "approved" as const,
      artifact: { summary: type, content: type, evidence: [], warnings: [], confidence: 70, updatedAt: base.updatedAt },
    })),
  };
}

describe("Growth Studio domain v2", () => {
  it("normalizes legacy data without moving nodes", () => {
    const legacy = createGrowthStudioWorkspace();
    legacy.nodes[0].position = { x: 321, y: 654 };
    const result = normalizeGrowthWorkspace(legacy);
    expect(result.schemaVersion).toBe(2);
    expect(result.nodes[0].position).toEqual({ x: 321, y: 654 });
    expect(result.context?.status).toBe("needs_confirmation");
  });

  it("blocks a product context mismatch", () => {
    const workspace = completeWorkspace();
    workspace.context = { ...workspace.context!, productId: "wrong-product" };
    expect(validateGrowthWorkspaceContext(workspace)).toMatchObject({ valid: false });
  });

  it("invalidates descendants recursively and preserves their old artifacts", () => {
    const workspace = completeWorkspace();
    const result = invalidateGrowthDependencies(workspace, "product_plan", { code: "product_changed", message: "Sản phẩm đã đổi." });
    expect(result.nodes.find((node) => node.id === "social_preview")?.status).toBe("stale");
    expect(result.nodes.find((node) => node.id === "social_preview")?.artifact?.content).toBe("social_preview");
    expect(result.nodes.find((node) => node.id === "social_preview")?.staleReasons?.[0].message).toBe("Sản phẩm đã đổi.");
  });

  it("creates a stable hash independent of object key order", () => {
    expect(hashGrowthNodeInput({ a: 1, nested: { x: 2, y: 3 } })).toBe(hashGrowthNodeInput({ nested: { y: 3, x: 2 }, a: 1 }));
  });
});
