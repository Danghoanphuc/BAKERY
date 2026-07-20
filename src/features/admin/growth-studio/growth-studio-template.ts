import type {
  GrowthNodeType,
  GrowthStudioEdge,
  GrowthStudioNode,
  GrowthStudioWorkspace,
} from "./growth-studio-contract";
import { getGrowthNodeModelRecommendation } from "./growth-studio-models";

export type GrowthNodeExecutor = "ai" | "human";
export type GrowthNodeDefinition = {
  type: GrowthNodeType;
  title: string;
  shortTitle: string;
  description: string;
  executor: GrowthNodeExecutor;
  dependsOn: GrowthNodeType[];
  promptVersion: string;
  prompt: string;
};

export const GROWTH_NODE_DEFINITIONS: Record<GrowthNodeType, GrowthNodeDefinition> = {
  customer_profile: {
    type: "customer_profile",
    title: "Hồ sơ khách hàng",
    shortTitle: "Khách hàng",
    description: "Xác định người mua, bối cảnh, động cơ và các giả định cần kiểm chứng.",
    executor: "ai",
    dependsOn: [],
    promptVersion: "customer-profile.v2",
    prompt:
      "Phác thảo một hồ sơ khách hàng mục tiêu có ý nghĩa cho SweetTime dựa trên bối cảnh tiệm bánh và dữ liệu đã có. Tập trung vào hoàn cảnh mua, động cơ và dấu hiệu có thể kiểm chứng. Phân biệt rõ dữ kiện với giả định; không bắt đầu từ một sản phẩm cụ thể.",
  },
  jobs_pains_gains: {
    type: "jobs_pains_gains",
    title: "Gains · Pains · Jobs",
    shortTitle: "Gains · Pains · Jobs",
    description: "Làm rõ việc khách hàng cần làm, điều gây khó chịu và kết quả họ mong đợi.",
    executor: "ai",
    dependsOn: ["customer_profile"],
    promptVersion: "jobs-pains-gains.v2",
    prompt:
      "Từ hồ sơ khách hàng, phân tích Jobs-to-be-Done, pains và gains trong các tình huống mua hoặc sử dụng bánh. Chưa gắn kết quả vào một sản phẩm cụ thể.",
  },
  real_needs: {
    type: "real_needs",
    title: "Nhu cầu thực sự",
    shortTitle: "Nhu cầu",
    description: "Chuyển quan sát thành nhu cầu có thể phục vụ và kiểm chứng.",
    executor: "ai",
    dependsOn: ["jobs_pains_gains"],
    promptVersion: "real-needs.v2",
    prompt:
      "Tổng hợp những nhu cầu SweetTime thực sự có thể đáp ứng. Xếp hạng theo mức quan trọng và tránh suy diễn vượt quá bằng chứng đầu vào.",
  },
  value_proposition: {
    type: "value_proposition",
    title: "Đề xuất giá trị",
    shortTitle: "Giá trị",
    description: "Nêu rõ cách SweetTime tạo gain, giảm pain và hỗ trợ job quan trọng.",
    executor: "ai",
    dependsOn: ["real_needs"],
    promptVersion: "value-proposition.v2",
    prompt:
      "Viết đề xuất giá trị cụ thể: SweetTime tạo điều khách hàng mong muốn, giảm nỗi đau và giúp hoàn thành công việc nào. Không dùng khẩu hiệu rỗng.",
  },
  product_plan: {
    type: "product_plan",
    title: "Can thiệp sản phẩm",
    shortTitle: "Sản phẩm",
    description: "Cụ thể hóa đề xuất giá trị thành thay đổi hoặc cách trình bày sản phẩm.",
    executor: "ai",
    dependsOn: ["value_proposition"],
    promptVersion: "product-plan.v2",
    prompt:
      "Dựa trên giá trị đã duyệt và sản phẩm được chọn tại node này, đề xuất các can thiệp thực tế: điểm cần nhấn mạnh, gói bán, khẩu phần, cách phục vụ hoặc thông tin cần bổ sung. Không đổi công thức nếu không có dữ liệu cho phép.",
  },
  image_intervention: {
    type: "image_intervention",
    title: "Can thiệp hình ảnh",
    shortTitle: "Hình ảnh",
    description: "Phân tích ảnh và đưa ra overlay, crop hoặc bố cục social phù hợp.",
    executor: "ai",
    dependsOn: ["product_plan"],
    promptVersion: "image-intervention.v2",
    prompt:
      "Phân tích ảnh sản phẩm hiện tại. Chỉ ra chủ thể, vùng trống, rủi ro che món và đề xuất tối đa hai overlay ngắn. Không được thay đổi bản chất sản phẩm.",
  },
  product_content: {
    type: "product_content",
    title: "Nội dung sản phẩm",
    shortTitle: "Nội dung",
    description: "Soạn USP, mô tả ngắn, khẩu phần và thông tin hiển thị có căn cứ.",
    executor: "ai",
    dependsOn: ["product_plan"],
    promptVersion: "product-content.v2",
    prompt:
      "Soạn nội dung sản phẩm gồm mô tả ngắn, các điểm bán hàng nổi bật, khẩu phần/cách dùng và thông tin thành phần có thể hiển thị. Chỉ dùng dữ kiện đã cung cấp.",
  },
  social_preview: {
    type: "social_preview",
    title: "Social preview",
    shortTitle: "Preview",
    description: "Kết hợp ảnh và nội dung thành phương án OG/social preview.",
    executor: "ai",
    dependsOn: ["image_intervention", "product_content"],
    promptVersion: "social-preview.v2",
    prompt:
      "Tạo phương án social preview cuối: một headline ngắn, một supporting line tùy chọn và CTA nhẹ. Nội dung phải ăn khớp với hình ảnh, không lặp nguyên tên sản phẩm và không bịa claim.",
  },
  approval: {
    type: "approval",
    title: "Kiểm tra và duyệt",
    shortTitle: "Duyệt",
    description: "Kiểm tra bằng chứng, cảnh báo và chốt phiên bản sẵn sàng xuất bản.",
    executor: "human",
    dependsOn: ["social_preview"],
    promptVersion: "approval.v1",
    prompt: "",
  },
};

const nodeLayout: Array<[GrowthNodeType, number, number]> = [
  ["customer_profile", 40, 40],
  ["jobs_pains_gains", 500, 40],
  ["real_needs", 960, 40],
  ["value_proposition", 1420, 40],
  ["product_plan", 1880, 40],
  ["image_intervention", 2340, -300],
  ["product_content", 2340, 460],
  ["social_preview", 2800, 40],
  ["approval", 3260, 40],
];

const edgePairs: Array<[GrowthNodeType, GrowthNodeType]> = [
  ["customer_profile", "jobs_pains_gains"],
  ["jobs_pains_gains", "real_needs"],
  ["real_needs", "value_proposition"],
  ["value_proposition", "product_plan"],
  ["product_plan", "image_intervention"],
  ["product_plan", "product_content"],
  ["image_intervention", "social_preview"],
  ["product_content", "social_preview"],
  ["social_preview", "approval"],
];

export function createGrowthStudioWorkspace(): GrowthStudioWorkspace {
  const now = new Date().toISOString();
  const edges: GrowthStudioEdge[] = edgePairs.map(([source, target]) => ({
    id: `${source}__${target}`,
    source,
    target,
  }));
  return {
    schemaVersion: 2,
    id: globalThis.crypto.randomUUID(),
    title: "Chiến lược khách hàng",
    description: "Từ hiểu khách hàng đến nội dung và social preview được duyệt.",
    workspaceType: "PRODUCT_GROWTH_WORKSPACE",
    templateId: "product_social_launch_v1",
    templateVersion: 1,
    nodes: [createGrowthStudioNode("customer_profile")],
    context: { status: "needs_confirmation", warning: "Cần xác nhận hồ sơ khách hàng và phân khúc." },
    edges: edges.map((edge) => ({ ...edge, dependencyType: "approval", required: true })),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function createGrowthStudioNode(type: GrowthNodeType): GrowthStudioNode {
  const layout = nodeLayout.find(([candidate]) => candidate === type);
  const recommendation = getGrowthNodeModelRecommendation(type);
  return {
    id: type,
    type,
    position: { x: layout?.[1] || 360, y: layout?.[2] || 40 },
    status: "ready",
    ...(recommendation ? { aiModel: recommendation.model } : {}),
  };
}

export type GrowthCanvasLayout = "horizontal" | "vertical" | "compact";

export const GROWTH_NODE_ORDER = nodeLayout.map(([type]) => type);

export function growthNodePositionFor(layout: GrowthCanvasLayout, type: GrowthNodeType, index: number) {
  if (layout === "vertical") return { x: 40, y: 40 + index * 680 };
  if (layout === "compact") {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return { x: 40 + column * 460, y: 40 + row * 680 };
  }
  return createGrowthStudioNode(type).position;
}

function growthNodesOverlap(left: GrowthStudioNode, right: GrowthStudioNode) {
  const width = 420;
  const height = 620;
  const gap = 28;
  return !(
    left.position.x + width + gap <= right.position.x ||
    right.position.x + width + gap <= left.position.x ||
    left.position.y + height + gap <= right.position.y ||
    right.position.y + height + gap <= left.position.y
  );
}

export function hasOverlappingGrowthNodes(nodes: GrowthStudioNode[]) {
  return nodes.some((node, index) => nodes.slice(index + 1).some((candidate) => growthNodesOverlap(node, candidate)));
}

export function repairOverlappingGrowthNodes(
  workspace: GrowthStudioWorkspace,
  layout: GrowthCanvasLayout = "horizontal",
) {
  if (!hasOverlappingGrowthNodes(workspace.nodes)) return workspace;
  return {
    ...workspace,
    nodes: workspace.nodes.map((node, index) => ({
      ...node,
      position: growthNodePositionFor(layout, node.type, index),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function getAddableNextNodeTypes(workspace: GrowthStudioWorkspace, sourceId: string): GrowthNodeType[] {
  return workspace.edges
    .filter((edge) => edge.source === sourceId)
    .map((edge) => edge.target as GrowthNodeType)
    .filter((type) => !workspace.nodes.some((node) => node.type === type))
    .filter((type) =>
      GROWTH_NODE_DEFINITIONS[type].dependsOn.every(
        (dependency) => workspace.nodes.find((node) => node.type === dependency)?.status === "approved",
      ),
    );
}

export function addGrowthStudioNode(workspace: GrowthStudioWorkspace, type: GrowthNodeType) {
  if (workspace.nodes.some((node) => node.type === type)) return workspace;
  return {
    ...workspace,
    nodes: [...workspace.nodes, createGrowthStudioNode(type)],
    updatedAt: new Date().toISOString(),
  };
}

function areDependenciesApproved(nodes: GrowthStudioNode[], node: GrowthStudioNode) {
  const dependencies = GROWTH_NODE_DEFINITIONS[node.type].dependsOn;
  return dependencies.every(
    (dependency) => nodes.find((candidate) => candidate.type === dependency)?.status === "approved",
  );
}

export function getRecommendedGrowthNode(workspace: GrowthStudioWorkspace) {
  const actionableStatuses = new Set(["needs_review", "failed", "stale", "ready"]);
  for (const [type] of nodeLayout) {
    const node = workspace.nodes.find((candidate) => candidate.type === type);
    if (node && actionableStatuses.has(node.status)) return node;
  }
  return workspace.nodes.find((node) => node.status !== "approved") || null;
}

export function refreshGrowthNodeAvailability(nodes: GrowthStudioNode[]) {
  return nodes.map((node) => {
    if (["running", "needs_review", "approved", "failed"].includes(node.status)) return node;
    if (areDependenciesApproved(nodes, node)) {
      return { ...node, status: node.status === "stale" ? "stale" : "ready" } as GrowthStudioNode;
    }
    return { ...node, status: node.artifact ? "stale" : "locked" } as GrowthStudioNode;
  });
}

export function getDescendantNodeIds(nodes: GrowthStudioNode[], edges: GrowthStudioEdge[], nodeId: string) {
  const existingIds = new Set(nodes.map((node) => node.id));
  const descendants = new Set<string>();
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    for (const edge of edges) {
      if (edge.source !== current || descendants.has(edge.target) || !existingIds.has(edge.target)) continue;
      descendants.add(edge.target);
      queue.push(edge.target);
    }
  }
  return descendants;
}

export function invalidateDescendants(workspace: GrowthStudioWorkspace, nodeId: string) {
  const descendants = getDescendantNodeIds(workspace.nodes, workspace.edges, nodeId);
  const nodes = workspace.nodes.map((node) => {
    if (!descendants.has(node.id)) return node;
    return {
      ...node,
      status: node.artifact ? "stale" : "locked",
      error: undefined,
    } as GrowthStudioNode;
  });
  return {
    ...workspace,
    status: "draft" as const,
    approvedAt: undefined,
    nodes: refreshGrowthNodeAvailability(nodes),
    updatedAt: new Date().toISOString(),
  };
}

export function replaceNode(
  workspace: GrowthStudioWorkspace,
  nodeId: string,
  updater: (node: GrowthStudioNode) => GrowthStudioNode,
) {
  const nodes = workspace.nodes.map((node) => (node.id === nodeId ? updater(node) : node));
  return { ...workspace, nodes, updatedAt: new Date().toISOString() };
}

export function approveGrowthNode(
  workspace: GrowthStudioWorkspace,
  nodeId: string,
): GrowthStudioWorkspace {
  const selected = workspace.nodes.find((node) => node.id === nodeId);
  if (!selected) return workspace;
  if (selected.type !== "approval" && !selected.artifact?.content.trim()) return workspace;
  if (!areDependenciesApproved(workspace.nodes, selected)) return workspace;

  const nodes = workspace.nodes.map((node) =>
    node.id === nodeId ? {
      ...node,
      status: "approved" as const,
      ...(node.currentDraftRevisionId ? { approvedOutputRevisionId: node.currentDraftRevisionId } : {}),
      staleReasons: [],
      error: undefined,
    } : node,
  );
  const refreshed = refreshGrowthNodeAvailability(nodes);
  const finalApproval = selected.type === "approval";
  return {
    ...workspace,
    nodes: refreshed,
    ...(selected.type === "customer_profile" && selected.currentDraftRevisionId ? {
      context: {
        ...workspace.context,
        customerProfileId: selected.currentDraftRevisionId,
        segmentId: workspace.context?.segmentId || `segment:${selected.currentDraftRevisionId}`,
        status: workspace.product && workspace.context?.productId ? "resolved" as const : "needs_confirmation" as const,
      },
    } : {}),
    status: finalApproval ? "approved" : "in_review",
    ...(finalApproval ? { approvedAt: new Date().toISOString() } : {}),
    updatedAt: new Date().toISOString(),
  };
}
