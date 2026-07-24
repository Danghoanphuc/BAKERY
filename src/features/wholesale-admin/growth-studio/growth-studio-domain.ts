import type {
  GrowthNodeType,
  GrowthStudioNode,
  GrowthStudioWorkspace,
  GrowthWorkspaceContext,
  GrowthWorkspaceTemplateId,
  GrowthWorkspaceType,
} from "./growth-studio-contract";
import { GROWTH_STUDIO_SCHEMA_VERSION } from "./growth-studio-contract";
import { getGrowthNodeModelRecommendation, isGrowthAiModelId } from "./growth-studio-models";

const PRODUCT_DOWNSTREAM_TYPES = new Set<GrowthNodeType>([
  "product_plan", "image_intervention", "product_content", "social_preview", "approval",
]);

export const GROWTH_WORKSPACE_TEMPLATES: ReadonlyArray<{
  id: GrowthWorkspaceTemplateId;
  label: string;
  type: GrowthWorkspaceType;
  description: string;
}> = [
  { id: "market_segments", label: "Thị trường và phân khúc khách hàng", type: "STRATEGY_FOUNDATION", description: "Hiểu thị trường, khách hàng và các phân khúc ưu tiên." },
  { id: "brand_positioning", label: "Định vị và kiến trúc thương hiệu", type: "STRATEGY_FOUNDATION", description: "Chốt vai trò thương hiệu và nguyên tắc định vị." },
  { id: "product_value_architecture", label: "Danh mục sản phẩm và kiến trúc giá trị", type: "STRATEGY_FOUNDATION", description: "Liên kết danh mục với nhu cầu và giá trị." },
  { id: "message_evidence", label: "Thông điệp và bằng chứng", type: "STRATEGY_FOUNDATION", description: "Quản lý claim, bằng chứng và thông điệp." },
  { id: "pricing_offers", label: "Giá, offer và khuyến mãi", type: "STRATEGY_FOUNDATION", description: "Thiết kế offer có căn cứ và giới hạn rõ ràng." },
  { id: "channels_journey", label: "Kênh và hành trình khách hàng", type: "STRATEGY_FOUNDATION", description: "Xác định điểm chạm và hành trình ưu tiên." },
  { id: "growth_measurement", label: "Đo lường và thử nghiệm tăng trưởng", type: "STRATEGY_FOUNDATION", description: "Giả thuyết, thử nghiệm và tiêu chí đánh giá." },
  { id: "product_social_launch_v1", label: "Chiến lược sản phẩm cụ thể", type: "PRODUCT_GROWTH_WORKSPACE", description: "Từ khách hàng đến sản phẩm, nội dung và social preview." },
];

function inferContext(workspace: GrowthStudioWorkspace): GrowthWorkspaceContext {
  const productId = workspace.context?.productId || workspace.product?.id;
  const customer = workspace.nodes.find((node) => node.type === "customer_profile");
  const customerProfileId = workspace.context?.customerProfileId || customer?.approvedOutputRevisionId;
  const segmentId = workspace.context?.segmentId;
  const resolved = Boolean(customerProfileId && segmentId && (!workspace.product || productId));
  return {
    ...(customerProfileId ? { customerProfileId } : {}),
    ...(segmentId ? { segmentId } : {}),
    ...(productId ? { productId } : {}),
    status: resolved ? "resolved" : "needs_confirmation",
    ...(!resolved ? { warning: "Cần xác nhận hồ sơ khách hàng hoặc phân khúc trước khi phát hành." } : {}),
  };
}

export function normalizeGrowthWorkspace(workspace: GrowthStudioWorkspace): GrowthStudioWorkspace {
  const now = new Date().toISOString();
  const workspaceType = workspace.workspaceType || "PRODUCT_GROWTH_WORKSPACE";
  const nodes = Array.isArray(workspace.nodes) ? workspace.nodes.map((node) => {
    const recommendation = getGrowthNodeModelRecommendation(node.type);
    return {
      ...node,
      ...(recommendation && !isGrowthAiModelId(node.aiModel) ? { aiModel: recommendation.model } : {}),
      staleReasons: node.staleReasons || [],
    };
  }) : [];
  const normalized: GrowthStudioWorkspace = {
    ...workspace,
    schemaVersion: GROWTH_STUDIO_SCHEMA_VERSION,
    workspaceType,
    description: workspace.description || (workspaceType === "PRODUCT_GROWTH_WORKSPACE" ? "Luồng chiến lược sản phẩm và social preview" : "Nền tảng chiến lược dùng chung"),
    templateVersion: Math.max(1, workspace.templateVersion || 1),
    nodes,
    edges: (workspace.edges || []).map((edge) => ({ ...edge, dependencyType: edge.dependencyType || "approval", required: edge.required !== false })),
    createdAt: workspace.createdAt || now,
    updatedAt: workspace.updatedAt || now,
  };
  return { ...normalized, context: inferContext(normalized) };
}

export function validateGrowthWorkspaceContext(workspace: GrowthStudioWorkspace) {
  const normalized = normalizeGrowthWorkspace(workspace);
  const errors: string[] = [];
  if (normalized.product && normalized.context?.productId !== normalized.product.id) {
    errors.push("product_id trong context không khớp sản phẩm của workspace.");
  }
  for (const node of normalized.nodes) {
    if (!PRODUCT_DOWNSTREAM_TYPES.has(node.type) || !node.artifact) continue;
    if (node.type !== "product_plan" && !normalized.context?.productId) {
      errors.push(`Node ${node.type} thiếu product_id.`);
    }
  }
  return { valid: errors.length === 0, errors, context: normalized.context! };
}

export function canReleaseGrowthWorkspace(workspace: GrowthStudioWorkspace) {
  const context = validateGrowthWorkspaceContext(workspace);
  const approval = workspace.nodes.find((node) => node.type === "approval");
  const stale = workspace.nodes.filter((node) => node.status === "stale");
  const errors = [...context.errors];
  if (context.context.status !== "resolved") errors.push(context.context.warning || "Context chưa được xác nhận.");
  if (!approval || approval.status !== "approved") errors.push("Workspace chưa được duyệt ở node cuối.");
  if (stale.length) errors.push(`${stale.length} node đang cần chạy lại.`);
  return { allowed: errors.length === 0, errors };
}

export function contextForNode(workspace: GrowthStudioWorkspace, node: GrowthStudioNode) {
  const context = normalizeGrowthWorkspace(workspace).context!;
  return {
    workspaceId: workspace.id,
    nodeId: node.id,
    nodeType: node.type,
    customerProfileId: context.customerProfileId,
    segmentId: context.segmentId,
    productId: PRODUCT_DOWNSTREAM_TYPES.has(node.type) ? context.productId : undefined,
  };
}

export function semanticWorkspaceDiff(before: GrowthStudioWorkspace, after: GrowthStudioWorkspace) {
  const changedNodes: Array<{ nodeId: string; type: "added" | "changed"; fields?: string[] }> = [];
  for (const node of after.nodes) {
    const previous = before.nodes.find((candidate) => candidate.id === node.id);
    if (!previous) {
      changedNodes.push({ nodeId: node.id, type: "added" });
      continue;
    }
    const fields = ["status", "aiModel", "artifact", "position"] as const;
    const changedFields = fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(node[field]));
    if (changedFields.length) changedNodes.push({ nodeId: node.id, type: "changed", fields: [...changedFields] });
  }
  return {
    titleChanged: before.title !== after.title,
    contextChanged: JSON.stringify(before.context) !== JSON.stringify(after.context),
    changedNodes,
  };
}
