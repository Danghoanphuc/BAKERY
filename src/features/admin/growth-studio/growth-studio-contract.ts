export const GROWTH_STUDIO_SCHEMA_VERSION = 2 as const;

export type GrowthNodeType =
  | "customer_profile"
  | "jobs_pains_gains"
  | "real_needs"
  | "value_proposition"
  | "product_plan"
  | "image_intervention"
  | "product_content"
  | "social_preview"
  | "approval";

export type GrowthNodeStatus =
  | "locked"
  | "ready"
  | "running"
  | "needs_review"
  | "approved"
  | "stale"
  | "failed";

export type GrowthWorkspaceStatus =
  | "draft"
  | "processing"
  | "in_review"
  | "approved"
  | "stale"
  | "released"
  | "failed";

export type GrowthWorkspaceType = "STRATEGY_FOUNDATION" | "PRODUCT_GROWTH_WORKSPACE";
export type GrowthWorkspaceTemplateId =
  | "market_segments"
  | "brand_positioning"
  | "product_value_architecture"
  | "message_evidence"
  | "pricing_offers"
  | "channels_journey"
  | "growth_measurement"
  | "product_social_launch_v1";

export type GrowthAiModelId = "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";

export type GrowthStudioProduct = {
  id: string;
  name: string;
  imageUrl: string;
  categoryId?: string;
  shortDescription?: string;
  description?: string;
  sellingPoints: string[];
  ingredients: string[];
  allergens: string[];
  dietaryTags: string[];
  occasionTags: string[];
  servingSuggestion?: string;
  servingSize?: string;
  sweetnessLevel?: "low" | "medium" | "high";
  price?: number;
};

export type GrowthEvidenceRef = {
  id: string;
  label: string;
  sourceType: "product" | "upstream_node" | "knowledge" | "human" | "external";
  sourceId?: string;
};

export type GrowthNodeArtifact = {
  summary: string;
  content: string;
  structuredData?: Record<string, unknown>;
  evidence: string[];
  evidenceRefs?: GrowthEvidenceRef[];
  assumptions?: string[];
  warnings: string[];
  humanConfirmations?: string[];
  confidence: number;
  updatedAt: string;
  generatedByModel?: GrowthAiModelId;
};

export type GrowthStaleReason = {
  code:
    | "upstream_changed"
    | "model_changed"
    | "prompt_changed"
    | "product_changed"
    | "segment_changed"
    | "knowledge_changed";
  message: string;
  sourceNodeId?: string;
  detectedAt: string;
};

export type GrowthStudioNode = {
  id: string;
  type: GrowthNodeType;
  position: { x: number; y: number };
  status: GrowthNodeStatus;
  aiModel?: GrowthAiModelId;
  artifact?: GrowthNodeArtifact;
  currentDraftRevisionId?: string;
  approvedOutputRevisionId?: string;
  staleReasons?: GrowthStaleReason[];
  error?: string;
};

export type GrowthStudioEdge = {
  id: string;
  source: string;
  target: string;
  dependencyType?: "data" | "approval";
  required?: boolean;
};

export type GrowthWorkspaceContext = {
  customerProfileId?: string;
  segmentId?: string;
  productId?: string;
  status: "resolved" | "needs_confirmation";
  warning?: string;
};

export type GrowthStudioWorkspace = {
  schemaVersion?: typeof GROWTH_STUDIO_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  workspaceType?: GrowthWorkspaceType;
  templateId: GrowthWorkspaceTemplateId;
  templateVersion: number;
  product?: GrowthStudioProduct;
  context?: GrowthWorkspaceContext;
  nodes: GrowthStudioNode[];
  edges: GrowthStudioEdge[];
  status: GrowthWorkspaceStatus;
  currentRevisionId?: string;
  currentCheckpointId?: string;
  currentVersion?: string;
  currentReleaseVersion?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  archivedAt?: string;
};

export type GrowthRevisionKind = "autosave" | "manual" | "restore" | "migration";
export type GrowthWorkspaceRevision = {
  id: string;
  workspaceId: string;
  kind: GrowthRevisionKind;
  snapshot: GrowthStudioWorkspace;
  parentRevisionId?: string;
  restoredFromRevisionId?: string;
  createdBy: string;
  createdAt: string;
};

export type GrowthNodeRunStatus = "running" | "completed" | "failed";
export type GrowthNodeRun = {
  id: string;
  workspaceId: string;
  nodeId: string;
  nodeType: GrowthNodeType;
  customerProfileId?: string;
  segmentId?: string;
  productId?: string;
  upstreamRevisionIds: string[];
  knowledgeObjectRevisionIds: string[];
  modelId: GrowthAiModelId;
  modelConfig: Record<string, unknown>;
  promptVersion: string;
  inputSnapshot: Record<string, unknown>;
  inputHash: string;
  output?: GrowthNodeArtifact;
  outputRevisionId?: string;
  status: GrowthNodeRunStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
};

export type GrowthOutputRevision = {
  id: string;
  workspaceId: string;
  nodeId: string;
  parentRevisionId?: string;
  runId?: string;
  artifact: GrowthNodeArtifact;
  upstreamRevisionIds: string[];
  knowledgeObjectRevisionIds: string[];
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
};

export type GrowthCheckpoint = {
  id: string;
  workspaceId: string;
  name: string;
  snapshot: GrowthStudioWorkspace;
  sourceRevisionId?: string;
  createdBy: string;
  createdAt: string;
};

export type GrowthRelease = {
  id: string;
  workspaceId: string;
  version: string;
  immutableSnapshot: GrowthStudioWorkspace;
  approvedBy: string;
  publishedAt: string;
  externalReferences: string[];
};

export type GrowthKnowledgeStatus =
  | "hypothesis"
  | "observed"
  | "supported"
  | "validated"
  | "contradicted"
  | "deprecated";

export type GrowthKnowledgeObject = {
  id: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  status: GrowthKnowledgeStatus;
  confidence: number;
  currentRevisionId: string;
  evidenceRefs: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  workspaceIds: string[];
  updatedAt: string;
};

export type GrowthEvidence = {
  id: string;
  sourceType: string;
  sourceId: string;
  excerpt: string;
  capturedAt: string;
  reliability: number;
  metadata: Record<string, unknown>;
};

export type GrowthHistory = {
  revisions: GrowthWorkspaceRevision[];
  runs: GrowthNodeRun[];
  checkpoints: GrowthCheckpoint[];
  releases: GrowthRelease[];
};

export type GrowthStudioBootstrap = {
  products: GrowthStudioProduct[];
  workspaces: GrowthStudioWorkspace[];
};

export type GrowthNodeAiReply = Omit<GrowthNodeArtifact, "updatedAt" | "generatedByModel">;

const stringSchema = { type: "string" } as const;

export const growthNodeAiReplySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "content", "structuredData", "evidence", "assumptions", "warnings", "humanConfirmations", "confidence"],
  properties: {
    summary: stringSchema,
    content: stringSchema,
    structuredData: {
      type: "object",
      additionalProperties: false,
      required: ["sections"],
      properties: {
        sections: {
          type: "array",
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "value"],
            properties: { key: stringSchema, value: stringSchema },
          },
        },
      },
    },
    evidence: { type: "array", items: stringSchema, maxItems: 8 },
    assumptions: { type: "array", items: stringSchema, maxItems: 8 },
    warnings: { type: "array", items: stringSchema, maxItems: 6 },
    humanConfirmations: { type: "array", items: stringSchema, maxItems: 6 },
    confidence: { type: "number", minimum: 0, maximum: 100 },
  },
} as const;
