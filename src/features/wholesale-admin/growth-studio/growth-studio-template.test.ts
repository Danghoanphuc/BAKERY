import { describe, expect, it } from "vitest";
import type { GrowthNodeArtifact, GrowthStudioProduct, GrowthStudioWorkspace } from "./growth-studio-contract";
import {
  addGrowthStudioNode,
  approveGrowthNode,
  createGrowthStudioWorkspace,
  getAddableNextNodeTypes,
  getRecommendedGrowthNode,
  hasOverlappingGrowthNodes,
  invalidateDescendants,
  repairOverlappingGrowthNodes,
  replaceNode,
} from "./growth-studio-template";
import { getGrowthNodeAiModel, getGrowthNodeModelRecommendation } from "./growth-studio-models";

const product: GrowthStudioProduct = {
  id: "panna-cotta",
  name: "Panna Cotta",
  imageUrl: "https://example.com/panna-cotta.jpg",
  description: "Panna cotta mềm mịn dùng lạnh.",
  sellingPoints: ["Mềm mịn"],
  ingredients: ["Sữa", "Kem"],
  allergens: ["Sữa"],
  dietaryTags: [],
  occasionTags: ["Tráng miệng"],
};

const artifact: GrowthNodeArtifact = {
  summary: "Kết quả có bằng chứng",
  content: "Nội dung đã được quản trị viên kiểm tra.",
  evidence: ["products.description"],
  warnings: [],
  confidence: 80,
  updatedAt: "2026-07-19T00:00:00.000Z",
};

const allNodeTypes = [
  "customer_profile",
  "jobs_pains_gains",
  "real_needs",
  "value_proposition",
  "product_plan",
  "image_intervention",
  "product_content",
  "social_preview",
  "approval",
] as const;

function createFullWorkspace() {
  return allNodeTypes.reduce<GrowthStudioWorkspace>(
    (workspace, type) => addGrowthStudioNode(workspace, type),
    { ...createGrowthStudioWorkspace(), product },
  );
}

describe("Growth Studio causal workflow", () => {
  it("chỉ mở node kế tiếp sau khi đầu vào được duyệt", () => {
    const workspace = createGrowthStudioWorkspace();
    expect(workspace.nodes.map((node) => node.type)).toEqual(["customer_profile"]);
    expect(workspace.product).toBeUndefined();

    const withDraft = replaceNode(workspace, "customer_profile", (node) => ({
      ...node,
      artifact,
      status: "needs_review",
    }));
    const approved = approveGrowthNode(withDraft, "customer_profile");
    expect(approved.nodes.find((node) => node.id === "customer_profile")?.status).toBe("approved");
    expect(getAddableNextNodeTypes(approved, "customer_profile")).toEqual(["jobs_pains_gains"]);
  });

  it("ưu tiên hai nhánh hình ảnh rồi nội dung sau bước sản phẩm", () => {
    const workspace = createFullWorkspace();
    const readyBranches = {
      ...workspace,
      nodes: workspace.nodes.map((node) => {
        if (["customer_profile", "jobs_pains_gains", "real_needs", "value_proposition", "product_plan"].includes(node.id)) {
          return { ...node, artifact, status: "approved" as const };
        }
        if (["image_intervention", "product_content"].includes(node.id)) {
          return { ...node, status: "ready" as const };
        }
        return node;
      }),
    };

    expect(getRecommendedGrowthNode(readyBranches)?.id).toBe("image_intervention");
    const imageApproved = replaceNode(readyBranches, "image_intervention", (node) => ({
      ...node,
      artifact,
      status: "approved",
    }));
    expect(getRecommendedGrowthNode(imageApproved)?.id).toBe("product_content");
  });

  it("đánh dấu toàn bộ downstream là stale khi upstream thay đổi", () => {
    const workspace = createFullWorkspace();
    const completed = {
      ...workspace,
      nodes: workspace.nodes.map((node) => ({
        ...node,
        artifact,
        status: "approved" as const,
      })),
      status: "approved" as const,
    };
    const invalidated = invalidateDescendants(completed, "value_proposition");

    expect(invalidated.nodes.find((node) => node.id === "customer_profile")?.status).toBe("approved");
    expect(invalidated.nodes.find((node) => node.id === "product_plan")?.status).toBe("stale");
    expect(invalidated.nodes.find((node) => node.id === "image_intervention")?.status).toBe("stale");
    expect(invalidated.nodes.find((node) => node.id === "product_content")?.status).toBe("stale");
    expect(invalidated.nodes.find((node) => node.id === "approval")?.status).toBe("stale");
    expect(invalidated.status).toBe("draft");
    expect(invalidated.approvedAt).toBeUndefined();
  });

  it("tự dàn lại workspace cũ khi các node bị chồng lên nhau", () => {
    const workspace = createFullWorkspace();
    const clumped = {
      ...workspace,
      nodes: workspace.nodes.map((node) => ({ ...node, position: { x: 40, y: 40 } })),
    };

    expect(hasOverlappingGrowthNodes(clumped.nodes)).toBe(true);
    const repaired = repairOverlappingGrowthNodes(clumped, "horizontal");
    expect(hasOverlappingGrowthNodes(repaired.nodes)).toBe(false);
    expect(repaired.nodes.find((node) => node.type === "image_intervention")?.position.y).toBeLessThan(0);
    expect(repaired.nodes.find((node) => node.type === "product_content")?.position.y).toBeGreaterThan(0);
  });

  it("gán model đề xuất theo loại tác vụ và không dùng model tùy ý", () => {
    const workspace = createGrowthStudioWorkspace();
    const customerNode = workspace.nodes[0];
    expect(getGrowthNodeModelRecommendation("customer_profile")?.model).toBe("gpt-5.6-sol");
    expect(getGrowthNodeAiModel(customerNode)).toBe("gpt-5.6-sol");
    expect(getGrowthNodeModelRecommendation("product_content")?.model).toBe("gpt-5.6-terra");
  });
});
