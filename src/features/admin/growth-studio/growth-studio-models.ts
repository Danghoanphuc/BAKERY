import type { GrowthAiModelId, GrowthNodeType, GrowthStudioNode } from "./growth-studio-contract";

export type GrowthAiModelOption = {
  id: GrowthAiModelId;
  displayName: string;
  note: string;
  capability: "deep_reasoning" | "balanced" | "fast";
  recommendedNodeTypes: GrowthNodeType[];
  costLevel: "low" | "medium" | "high";
  latencyLevel: "low" | "medium" | "high";
  enabled: boolean;
  config: Record<string, unknown>;
};

export const GROWTH_AI_MODELS: readonly GrowthAiModelOption[] = [
  {
    id: "gpt-5.6-sol", displayName: "GPT-5.6 Sol", note: "Suy luận sâu",
    capability: "deep_reasoning", recommendedNodeTypes: ["customer_profile", "jobs_pains_gains", "real_needs", "value_proposition"],
    costLevel: "high", latencyLevel: "high", enabled: true, config: { reasoningEffort: "low", maxOutputTokens: 2200 },
  },
  {
    id: "gpt-5.6-terra", displayName: "GPT-5.6 Terra", note: "Cân bằng",
    capability: "balanced", recommendedNodeTypes: ["product_plan", "image_intervention", "product_content", "social_preview"],
    costLevel: "medium", latencyLevel: "medium", enabled: true, config: { reasoningEffort: "low", maxOutputTokens: 2200 },
  },
  {
    id: "gpt-5.6-luna", displayName: "GPT-5.6 Luna", note: "Nhanh, tiết kiệm",
    capability: "fast", recommendedNodeTypes: ["product_content", "social_preview"],
    costLevel: "low", latencyLevel: "low", enabled: true, config: { reasoningEffort: "low", maxOutputTokens: 1600 },
  },
] as const;

const recommendation: Partial<Record<GrowthNodeType, { model: GrowthAiModelId; reason: string }>> = {
  customer_profile: { model: "gpt-5.6-sol", reason: "Suy luận chiến lược nhiều tầng" },
  jobs_pains_gains: { model: "gpt-5.6-sol", reason: "Phân tích động cơ và quan hệ nhân quả" },
  real_needs: { model: "gpt-5.6-sol", reason: "Tách nhu cầu thật khỏi giả định" },
  value_proposition: { model: "gpt-5.6-sol", reason: "Tổng hợp giá trị từ nhiều bằng chứng" },
  product_plan: { model: "gpt-5.6-terra", reason: "Đủ mạnh, cân bằng chi phí triển khai" },
  image_intervention: { model: "gpt-5.6-terra", reason: "Đọc ảnh và đề xuất bố cục hiệu quả" },
  product_content: { model: "gpt-5.6-terra", reason: "Soạn nội dung có cấu trúc, ít tốn kém hơn" },
  social_preview: { model: "gpt-5.6-terra", reason: "Kết hợp hình ảnh và thông điệp" },
};

export function isGrowthAiModelId(value: unknown): value is GrowthAiModelId {
  return GROWTH_AI_MODELS.some((model) => model.id === value && model.enabled);
}

export function getGrowthAiModel(modelId: GrowthAiModelId) {
  const model = GROWTH_AI_MODELS.find((candidate) => candidate.id === modelId && candidate.enabled);
  if (!model) throw new Error("GROWTH_MODEL_DISABLED");
  return model;
}

export function getGrowthNodeModelRecommendation(type: GrowthNodeType) {
  return recommendation[type];
}

export function getGrowthNodeAiModel(node: GrowthStudioNode): GrowthAiModelId {
  if (isGrowthAiModelId(node.aiModel)) return node.aiModel;
  return recommendation[node.type]?.model || "gpt-5.6-terra";
}
