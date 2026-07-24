import type { GrowthNodeType, GrowthStudioWorkspace } from "./growth-studio-contract";
import type { GrowthCanvasLayout } from "./growth-studio-template";

const phaseColumn: Record<GrowthNodeType, number> = {
  customer_profile: 0,
  jobs_pains_gains: 1,
  real_needs: 1,
  value_proposition: 2,
  product_plan: 3,
  image_intervention: 4,
  product_content: 4,
  social_preview: 5,
  approval: 6,
};

export const GROWTH_PHASES = [
  { id: "customer", label: "Customer Understanding", from: 0, to: 1 },
  { id: "value", label: "Value Strategy", from: 2, to: 2 },
  { id: "product", label: "Product Fit", from: 3, to: 3 },
  { id: "creative", label: "Creative Production", from: 4, to: 5 },
  { id: "governance", label: "Governance", from: 6, to: 6 },
] as const;

export function layoutGrowthWorkspace(workspace: GrowthStudioWorkspace, layout: GrowthCanvasLayout) {
  const ordered = [...workspace.nodes].sort((left, right) => phaseColumn[left.type] - phaseColumn[right.type]);
  const columnCounts = new Map<number, number>();
  const nodes = ordered.map((node, index) => {
    const column = phaseColumn[node.type];
    const row = columnCounts.get(column) || 0;
    columnCounts.set(column, row + 1);
    if (layout === "vertical") return { ...node, position: { x: row * 480 + 80, y: column * 720 + 100 } };
    if (layout === "compact") return { ...node, position: { x: (index % 3) * 460 + 80, y: Math.floor(index / 3) * 660 + 100 } };
    return { ...node, position: { x: column * 500 + 80, y: row * 700 + 100 } };
  });
  return { ...workspace, nodes, updatedAt: new Date().toISOString() };
}
