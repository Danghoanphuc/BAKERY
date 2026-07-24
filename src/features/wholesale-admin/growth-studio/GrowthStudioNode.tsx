"use client";

import { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  FileText,
  ImageIcon,
  Lightbulb,
  ListChecks,
  Loader2,
  LockKeyhole,
  PackageSearch,
  Play,
  Plus,
  RotateCcw,
  SearchCheck,
  Share2,
  ShoppingBag,
  Target,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import Image from "next/image";
import type {
  GrowthAiModelId,
  GrowthNodeArtifact,
  GrowthStaleReason,
  GrowthNodeStatus,
  GrowthNodeType,
  GrowthStudioProduct,
} from "./growth-studio-contract";
import { GROWTH_AI_MODELS } from "./growth-studio-models";

type NextNodeOption = { type: GrowthNodeType; label: string };

export type GrowthFlowNodeData = {
  title: string;
  status: GrowthNodeStatus;
  nodeType: GrowthNodeType;
  artifact?: GrowthNodeArtifact;
  executor: "ai" | "human";
  aiModel?: GrowthAiModelId;
  modelRecommendation?: { model: GrowthAiModelId; reason: string };
  error?: string;
  staleReasons?: GrowthStaleReason[];
  products: GrowthStudioProduct[];
  product?: GrowthStudioProduct;
  selectedProductId: string;
  activeWorkspaceId: string;
  customerProfiles: Array<{
    workspaceId: string;
    name: string;
    status: GrowthNodeStatus;
  }>;
  nextNodes: NextNodeOption[];
  onRun: (nodeId: string) => void;
  onApprove: (nodeId: string) => void;
  onArtifactChange: (nodeId: string, changes: Pick<GrowthNodeArtifact, "summary" | "content">) => void;
  onAiModelChange: (nodeId: string, model: GrowthAiModelId) => void;
  onSelectProduct: (productId: string) => void;
  onApplyProduct: (productId: string) => void;
  onOpenCustomerProfile: (workspaceId: string) => void;
  onCreateCustomerProfile: () => void;
  onAddNext: (sourceId: string, type: GrowthNodeType) => void;
} & Record<string, unknown>;

export type GrowthFlowNode = Node<GrowthFlowNodeData, "growthStudio">;

const statusMeta: Record<GrowthNodeStatus, { label: string; className: string; icon: typeof Check }> = {
  locked: { label: "Khóa", className: "bg-bg-soft text-text-muted", icon: LockKeyhole },
  ready: { label: "Sẵn sàng", className: "bg-brand-50 text-brand-700", icon: Play },
  running: { label: "Đang chạy", className: "bg-accent-gold/20 text-navy", icon: Loader2 },
  needs_review: { label: "Chờ duyệt", className: "bg-accent-gold/20 text-navy", icon: AlertTriangle },
  approved: { label: "Đã duyệt", className: "bg-accent-healthy/15 text-accent-healthy", icon: Check },
  stale: { label: "Cần chạy lại", className: "bg-brand-50 text-brand-700", icon: RotateCcw },
  failed: { label: "Có lỗi", className: "bg-brand-50 text-brand-700", icon: AlertTriangle },
};

const nodeIcons: Record<GrowthNodeType, typeof UserRound> = {
  customer_profile: UserRound,
  jobs_pains_gains: ListChecks,
  real_needs: SearchCheck,
  value_proposition: Target,
  product_plan: PackageSearch,
  image_intervention: ImageIcon,
  product_content: FileText,
  social_preview: Share2,
  approval: BadgeCheck,
};

function AddNextControl({
  sourceId,
  options,
  onAdd,
}: {
  sourceId: string;
  options: NextNodeOption[];
  onAdd: (sourceId: string, type: GrowthNodeType) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;
  return (
    <div className="growth-node-add nodrag absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="growth-node-icon-button grid h-11 w-11 place-items-center rounded-full border border-sand bg-bg-card text-brand-700"
        aria-label="Thêm node tiếp theo"
        aria-expanded={open}
      >
        <Plus className="h-5 w-5" />
      </button>
      {open ? (
        <div className="growth-node-menu absolute left-14 top-1/2 w-56 -translate-y-1/2 overflow-hidden rounded-2xl border border-sand bg-bg-card p-2">
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => {
                onAdd(sourceId, option.type);
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 text-left text-sm font-extrabold text-navy hover:bg-bg-soft active:bg-bg-surface"
            >
              <Plus className="h-4 w-4 shrink-0 text-brand-600" />
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GrowthStudioNode({ id, data, selected }: NodeProps<GrowthFlowNode>) {
  const status = statusMeta[data.status];
  const StatusIcon = status.icon;
  const NodeIcon = nodeIcons[data.nodeType];
  const artifact = data.artifact;
  const recommendation = data.modelRecommendation;
  const selectedModel = data.aiModel || recommendation?.model || "gpt-5.6-terra";
  const selectedModelMeta = GROWTH_AI_MODELS.find((model) => model.id === selectedModel);
  const recommendedModelMeta = GROWTH_AI_MODELS.find((model) => model.id === recommendation?.model);
  const canApprove = data.nodeType === "approval"
    ? ["ready", "stale"].includes(data.status)
    : data.status === "needs_review" && Boolean(artifact?.content.trim());
  const requiresProduct = data.nodeType === "product_plan";
  const isCustomerLibrary = data.nodeType === "customer_profile";
  const canRun = !requiresProduct || Boolean(data.product);

  return (
    <article
      className={clsx(
        "growth-node-card group relative overflow-visible rounded-3xl border bg-bg-card",
        isCustomerLibrary ? "w-[420px]" : "w-[388px]",
        selected ? "is-selected border-brand-500" : "border-sand",
      )}
      data-status={data.status}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="growth-node-handle !h-3 !w-3 !border-2 !border-bg-card !bg-brand-500" />

      <header className="growth-node-card__header flex items-start gap-3 px-5 pb-4 pt-5">
        <span className="growth-node-card__icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg-soft text-brand-700" aria-hidden="true">
          <NodeIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate font-display text-xl font-extrabold leading-tight text-navy">{data.title}</h2>
          <p className="mt-1 text-xs font-bold text-text-muted">Node {String(id).replace(/_/g, " ")}</p>
        </div>
        <span className={clsx("inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-extrabold", status.className)}>
          <StatusIcon className={clsx("h-3.5 w-3.5", data.status === "running" && "animate-spin")} />
          {status.label}
        </span>
      </header>

      <div className="growth-node-card__body space-y-4 border-t border-sand px-5 py-4">
        {isCustomerLibrary ? (
          <section className="nodrag space-y-2.5 border-b border-sand pb-4" aria-label="Hồ sơ khách hàng đã tạo">
            <div className="flex items-center gap-2 text-sm font-extrabold text-navy">
              <Users className="h-4 w-4 text-brand-600" /> Hồ sơ đã tạo
              <span className="ml-auto font-mono text-xs text-text-muted">{data.customerProfiles.length}</span>
            </div>
            {data.customerProfiles.length ? (
              <div className="nowheel max-h-48 space-y-1 overflow-y-auto pr-1">
                {data.customerProfiles.map((profile) => (
                  <button
                    key={profile.workspaceId}
                    type="button"
                    onClick={() => data.onOpenCustomerProfile(profile.workspaceId)}
                    aria-pressed={profile.workspaceId === data.activeWorkspaceId}
                    className={clsx(
                      "growth-node-profile flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm",
                      profile.workspaceId === data.activeWorkspaceId
                        ? "bg-bg-soft font-extrabold text-brand-700"
                        : "font-bold text-navy hover:bg-bg-soft active:bg-bg-surface",
                    )}
                  >
                    <span aria-hidden="true" className={clsx("h-2 w-2 shrink-0 rounded-full", profile.status === "approved" ? "bg-accent-healthy" : "bg-accent-gold")} />
                    <span className="min-w-0 flex-1 truncate">{profile.name}</span>
                    {profile.workspaceId === data.activeWorkspaceId ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-2 text-sm text-text-muted">Chưa có hồ sơ nào. Tạo hồ sơ đầu tiên ngay tại node này.</p>
            )}
            <button
              type="button"
              onClick={() => data.onCreateCustomerProfile()}
              className="growth-node-secondary inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-sand bg-bg-card px-3 text-sm font-extrabold text-navy"
            >
              <UserRoundPlus className="h-4 w-4" /> Tạo hồ sơ mới
            </button>
          </section>
        ) : null}

        {data.executor === "ai" ? (
          <section className="growth-node-model nodrag rounded-2xl bg-bg-soft px-3.5 py-3" aria-label="Mô hình AI cho node">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 shrink-0 text-brand-700" />
              <label htmlFor={`model-${id}`} className="text-xs font-extrabold text-navy">Mô hình AI</label>
              {selectedModel === recommendation?.model ? (
                <span className="ml-auto rounded-full bg-accent-healthy/15 px-2 py-1 text-[10px] font-extrabold text-accent-healthy">Đề xuất</span>
              ) : null}
            </div>
            <select
              id={`model-${id}`}
              value={selectedModel}
              onChange={(event) => data.onAiModelChange(id, event.target.value as GrowthAiModelId)}
              disabled={data.status === "running"}
              className="nowheel mt-2 h-11 w-full rounded-xl border border-sand bg-bg-card px-3 text-sm font-extrabold text-navy disabled:cursor-not-allowed disabled:opacity-55"
            >
              {GROWTH_AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>{model.displayName} · {model.note}</option>
              ))}
            </select>
            <p className="mt-2 flex gap-1.5 text-xs leading-5 text-text-muted">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {selectedModel === recommendation?.model
                ? recommendation?.reason
                : `Đang chọn ${selectedModelMeta?.displayName}. Đề xuất ${recommendedModelMeta?.displayName}: ${recommendation?.reason}`}
            </p>
            {artifact?.generatedByModel ? (
              <p className="mt-1 text-xs text-text-muted">Kết quả hiện tại được tạo bởi {GROWTH_AI_MODELS.find((model) => model.id === artifact.generatedByModel)?.displayName || artifact.generatedByModel}.</p>
            ) : null}
          </section>
        ) : null}

        {requiresProduct ? (
          <section className="nodrag space-y-3 border-b border-sand pb-4">
            <label htmlFor={`product-${id}`} className="block text-xs font-extrabold text-navy">Sản phẩm áp dụng</label>
            {data.product ? (
              <div className="flex items-center gap-3">
                {data.product.imageUrl ? (
                  <Image src={data.product.imageUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-bg-soft"><ShoppingBag className="h-5 w-5 text-text-muted" /></div>
                )}
                <p className="min-w-0 truncate text-sm font-extrabold text-navy">{data.product.name}</p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <select
                id={`product-${id}`}
                value={data.selectedProductId}
                onChange={(event) => data.onSelectProduct(event.target.value)}
                className="nowheel h-11 min-w-0 flex-1 rounded-xl border border-sand bg-bg-card px-3 text-sm font-bold text-navy"
              >
                <option value="">Chọn sản phẩm</option>
                {data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => data.onApplyProduct(data.selectedProductId)}
                disabled={!data.selectedProductId || data.selectedProductId === data.product?.id}
                className="growth-node-primary inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-brand-500 px-3 text-sm font-extrabold text-bg-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                Áp dụng
              </button>
            </div>
          </section>
        ) : null}

        {artifact ? (
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-bold text-text-muted">
              <span className="tabular-nums">Tin cậy {artifact.confidence}%</span>
              <span>{artifact.evidence.length} bằng chứng</span>
              {artifact.warnings.length ? <span className="inline-flex items-center gap-1 text-brand-700"><AlertTriangle className="h-3.5 w-3.5" />{artifact.warnings.length} cảnh báo</span> : null}
            </div>
            {artifact.assumptions?.length || artifact.humanConfirmations?.length ? (
              <div className="grid gap-2 rounded-xl border border-sand bg-bg-soft p-3 text-xs leading-5 text-text-muted">
                {artifact.assumptions?.length ? <p><strong className="text-navy">Giả định:</strong> {artifact.assumptions.join(" · ")}</p> : null}
                {artifact.humanConfirmations?.length ? <p><strong className="text-navy">Cần xác nhận:</strong> {artifact.humanConfirmations.join(" · ")}</p> : null}
              </div>
            ) : null}
            <div>
              <label htmlFor={`summary-${id}`} className="mb-1.5 block text-xs font-extrabold text-navy">Tóm tắt</label>
              <input
                id={`summary-${id}`}
                value={artifact.summary}
                onChange={(event) => data.onArtifactChange(id, { summary: event.target.value, content: artifact.content })}
                className="nodrag nowheel h-11 w-full rounded-xl border border-sand bg-bg-card px-3 text-sm font-bold text-navy disabled:cursor-not-allowed disabled:opacity-55"
                disabled={data.status === "running" || data.status === "locked"}
              />
            </div>
            <div>
              <label htmlFor={`content-${id}`} className="mb-1.5 block text-xs font-extrabold text-navy">Nội dung làm việc</label>
              <textarea
                id={`content-${id}`}
                value={artifact.content}
                onChange={(event) => data.onArtifactChange(id, { summary: artifact.summary, content: event.target.value })}
                rows={6}
                className="nodrag nowheel min-h-36 w-full resize-y rounded-xl border border-sand bg-bg-card px-3 py-3 text-sm leading-6 text-navy disabled:cursor-not-allowed disabled:opacity-55"
                disabled={data.status === "running" || data.status === "locked"}
              />
            </div>
          </section>
        ) : null}

        {data.status === "stale" && data.staleReasons?.length ? <p className="flex gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-700" role="status"><RotateCcw className="mt-1 h-4 w-4 shrink-0" />{data.staleReasons.map((reason) => reason.message).join(" ")}</p> : null}
        {data.error ? <p className="flex gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-700" role="alert"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />{data.error}</p> : null}

        <footer className="flex gap-2 border-t border-sand pt-4">
          {data.executor === "ai" && data.status !== "approved" ? (
            <button
              type="button"
              onClick={() => data.onRun(id)}
              disabled={data.status === "running" || data.status === "locked" || !canRun}
              className="growth-node-secondary nodrag inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-sand bg-bg-card px-3 text-sm font-extrabold text-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              {data.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {artifact ? "Chạy lại" : "Chạy AI"}
            </button>
          ) : null}
          {canApprove ? (
            <button
              type="button"
              onClick={() => data.onApprove(id)}
              className="growth-node-primary nodrag inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-500 px-3 text-sm font-extrabold text-bg-card"
            >
              <CheckCircle2 className="h-4 w-4" /> Duyệt
            </button>
          ) : null}
        </footer>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} className="growth-node-handle !h-3 !w-3 !border-2 !border-bg-card !bg-brand-500" />
      {data.status === "approved" ? <AddNextControl sourceId={id} options={data.nextNodes} onAdd={data.onAddNext} /> : null}
    </article>
  );
}
