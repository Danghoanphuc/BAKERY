"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  applyNodeChanges,
  useNodesState,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  GrowthAiModelId,
  GrowthNodeArtifact,
  GrowthNodeType,
  GrowthStudioBootstrap,
  GrowthStudioWorkspace,
  GrowthWorkspaceTemplateId,
} from "./growth-studio-contract";
import {
  addGrowthStudioNode,
  approveGrowthNode,
  getAddableNextNodeTypes,
  type GrowthCanvasLayout,
  GROWTH_NODE_DEFINITIONS,
  replaceNode,
} from "./growth-studio-template";
import { getGrowthNodeModelRecommendation, isGrowthAiModelId } from "./growth-studio-models";
import {
  GrowthStudioNode as GrowthStudioNodeCard,
  type GrowthFlowNode,
} from "./GrowthStudioNode";
import { GrowthStudioSidebar } from "./GrowthStudioSidebar";
import { GrowthStudioHeader } from "./GrowthStudioHeader";
import { GrowthStudioHistoryDrawer } from "./GrowthStudioHistoryDrawer";
import { invalidateGrowthDependencies } from "./growth-studio-invalidation-service";
import { layoutGrowthWorkspace } from "./growth-studio-layout-service";
import { GROWTH_PHASES } from "./growth-studio-layout-service";

type CanvasLayout = GrowthCanvasLayout;
type StudioFlowNode = GrowthFlowNode;
type WorkspaceEditorState = { workspaceId: string; title: string; description: string };

const nodeTypes = {
  growthStudio: GrowthStudioNodeCard,
};

export function GrowthStudio() {
  const [products, setProducts] = useState<GrowthStudioBootstrap["products"]>([]);
  const [workspaces, setWorkspaces] = useState<GrowthStudioWorkspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("customer_profile");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [layout, setLayout] = useState<CanvasLayout>("horizontal");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"revisions" | "checkpoints">("revisions");
  const [busyAction, setBusyAction] = useState<string>();
  const [workspaceEditor, setWorkspaceEditor] = useState<WorkspaceEditorState>();
  const workspaceDialogRef = useRef<HTMLDialogElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const flowInstanceRef = useRef<ReactFlowInstance<StudioFlowNode> | null>(null);
  const lastFitKeyRef = useRef("");
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<StudioFlowNode>([]);

  useEffect(() => {
    const dialog = workspaceDialogRef.current;
    if (!dialog) return;
    if (workspaceEditor && !dialog.open) dialog.showModal();
    if (!workspaceEditor && dialog.open) dialog.close();
  }, [workspaceEditor]);

  const activeWorkspace = useMemo(
    () => activeId ? workspaces.find((workspace) => workspace.id === activeId) || null : null,
    [activeId, workspaces],
  );

  const customerProfiles = useMemo(() => workspaces.flatMap((workspace) => {
    const profile = workspace.nodes.find((node) => node.type === "customer_profile");
    if (!profile?.artifact?.summary.trim()) return [];
    return [{
      workspaceId: workspace.id,
      name: profile.artifact.summary,
      status: profile.status,
    }];
  }), [workspaces]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const response = await fetch("/api/wholesale/growth-studio", { cache: "no-store" });
        const payload = (await response.json()) as GrowthStudioBootstrap & { error?: string };
        if (!response.ok) throw new Error(payload.error || "load_failed");
        if (cancelled) return;
        setProducts(payload.products);
        setWorkspaces(payload.workspaces);
        setActiveId((current) => current || payload.workspaces[0]?.id || null);
      } catch (error) {
        console.error("Failed to bootstrap Growth Studio:", error);
        toast.error("Không thể tải Growth Studio. Kiểm tra kết nối Firebase rồi thử lại.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeWorkspace || isLoading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const saveVersion = ++saveVersionRef.current;
    setIsSaving(true);
    const workspaceToSave = activeWorkspace;
    saveTimerRef.current = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          const response = await fetch(`/api/wholesale/growth-studio/${workspaceToSave.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspace: workspaceToSave }),
          });
          if (!response.ok) throw new Error("save_failed");
        } catch (error) {
          console.error("Failed to save Growth Studio workspace:", error);
          toast.error("Bản làm việc chưa được lưu. Kiểm tra kết nối rồi thử lại.");
        } finally {
          if (saveVersion === saveVersionRef.current) setIsSaving(false);
        }
      });
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [activeWorkspace, isLoading]);

  const updateWorkspace = useCallback((next: GrowthStudioWorkspace) => {
    setWorkspaces((current) => current.map((workspace) => workspace.id === next.id ? next : workspace));
  }, []);

  function focusNode(id: string, position: { x: number; y: number }) {
    setSelectedNodeId(id);
    window.requestAnimationFrame(() => {
      flowInstanceRef.current?.setCenter(position.x + 180, position.y + 130, { zoom: 0.82, duration: 260 });
    });
  }

  async function createCustomerProfile(templateId: GrowthWorkspaceTemplateId = "product_social_launch_v1") {
    // Event handlers must never leak a React SyntheticEvent into the API payload.
    const resolvedTemplateId = typeof templateId === "string" ? templateId : "product_social_launch_v1";
    setIsCreating(true);
    try {
      const response = await fetch("/api/wholesale/growth-studio", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: resolvedTemplateId }),
      });
      const payload = await response.json() as { workspace?: GrowthStudioWorkspace; error?: string };
      if (!response.ok || !payload.workspace) throw new Error(payload.error || "create_failed");
      setWorkspaces((current) => [payload.workspace!, ...current]);
      setActiveId(payload.workspace.id);
      setSelectedNodeId("customer_profile");
      setSelectedProductId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  function openCustomerProfile(workspaceId: string) {
    const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) return;
    setActiveId(workspace.id);
    setSelectedNodeId("customer_profile");
    setSelectedProductId(workspace.product?.id || "");
  }

  function addNextNode(_sourceId: string, type: GrowthNodeType) {
    if (!activeWorkspace) return;
    const next = addGrowthStudioNode(activeWorkspace, type);
    updateWorkspace(next);
    const node = next.nodes.find((candidate) => candidate.type === type);
    if (node) focusNode(node.id, node.position);
  }

  function applyProduct(productId: string) {
    if (!activeWorkspace) return;
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || activeWorkspace.product?.id === product.id) return;
    let next: GrowthStudioWorkspace = {
      ...activeWorkspace,
      product,
      context: { ...activeWorkspace.context, productId: product.id, status: activeWorkspace.context?.customerProfileId && activeWorkspace.context?.segmentId ? "resolved" : "needs_confirmation" },
      nodes: activeWorkspace.nodes.map((node) => node.type === "product_plan"
        ? { ...node, status: node.artifact ? "stale" as const : "ready" as const, error: undefined }
        : node),
      updatedAt: new Date().toISOString(),
    };
    next = invalidateGrowthDependencies(next, "product_plan", { code: "product_changed", message: `Sản phẩm đã đổi thành ${product.name}.` });
    updateWorkspace(next);
  }

  async function runNode(nodeId: string) {
    if (!activeWorkspace) return;
    const node = activeWorkspace.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.status === "locked" || node.status === "running") return;
    if (node.type === "product_plan" && !activeWorkspace.product) return;
    const runningWorkspace = replaceNode(activeWorkspace, nodeId, (candidate) => ({
      ...candidate,
      status: "running",
      error: undefined,
    }));
    updateWorkspace(runningWorkspace);
    try {
      const response = await fetch("/api/wholesale/growth-studio/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: runningWorkspace, nodeId }),
      });
      const payload = (await response.json()) as { artifact?: GrowthNodeArtifact; workspace?: GrowthStudioWorkspace; error?: string };
      if (!response.ok || !payload.artifact) throw new Error(payload.error || "execute_failed");
      let next = payload.workspace || replaceNode(runningWorkspace, nodeId, (candidate) => ({ ...candidate, artifact: payload.artifact, status: "needs_review", error: undefined }));
      next = invalidateGrowthDependencies(next, nodeId, { code: "upstream_changed", message: `Đầu ra ${GROWTH_NODE_DEFINITIONS[node.type].title} vừa thay đổi.` });
      updateWorkspace(next);
    } catch (error) {
      updateWorkspace(replaceNode(runningWorkspace, nodeId, (candidate) => ({
        ...candidate,
        status: "failed",
        error: error instanceof Error ? error.message : "AI chưa xử lý được node này.",
      })));
    }
  }

  function changeArtifact(nodeId: string, changes: Pick<GrowthNodeArtifact, "summary" | "content">) {
    if (!activeWorkspace) return;
    let next = replaceNode(activeWorkspace, nodeId, (node) => ({
      ...node,
      status: "needs_review",
      artifact: node.artifact ? { ...node.artifact, ...changes, updatedAt: new Date().toISOString() } : node.artifact,
    }));
    next = invalidateGrowthDependencies(next, nodeId, { code: "upstream_changed", message: "Nội dung đầu vào đã được chỉnh sửa thủ công." });
    updateWorkspace(next);
  }

  function changeAiModel(nodeId: string, model: GrowthAiModelId) {
    if (!activeWorkspace || !isGrowthAiModelId(model)) return;
    const selected = activeWorkspace.nodes.find((node) => node.id === nodeId);
    if (!selected || selected.aiModel === model) return;
    let next = replaceNode(activeWorkspace, nodeId, (node) => ({
      ...node,
      aiModel: model,
      status: node.artifact ? "stale" : node.status,
      error: undefined,
    }));
    if (selected.artifact) next = invalidateGrowthDependencies(next, nodeId, { code: "model_changed", message: `Model của ${GROWTH_NODE_DEFINITIONS[selected.type].title} đã thay đổi.` });
    updateWorkspace(next);
  }

  function approveNode(nodeId: string) {
    if (!activeWorkspace) return;
    updateWorkspace(approveGrowthNode(activeWorkspace, nodeId));
  }

  function applyLayout(nextLayout: CanvasLayout) {
    setLayout(nextLayout);
    if (activeWorkspace) {
      const next = layoutGrowthWorkspace(activeWorkspace, nextLayout);
      updateWorkspace(next);
    }
    window.requestAnimationFrame(() => flowInstanceRef.current?.fitView({ padding: 0.18, duration: 260 }));
  }

  useEffect(() => {
    if (!activeWorkspace) {
      setFlowNodes([]);
      return;
    }
    setFlowNodes((current) => activeWorkspace.nodes.map((node) => {
      const definition = GROWTH_NODE_DEFINITIONS[node.type];
      const existing = current.find((candidate) => candidate.id === node.id);
      return {
        id: node.id,
        type: "growthStudio",
        position: node.position,
        measured: existing?.measured,
        selected: selectedNodeId === node.id,
        draggable: true,
        data: {
          title: definition.title,
          status: node.status,
          nodeType: node.type,
          artifact: node.artifact,
          executor: definition.executor,
          aiModel: node.aiModel,
          modelRecommendation: getGrowthNodeModelRecommendation(node.type),
          error: node.error,
          staleReasons: node.staleReasons,
          products,
          product: activeWorkspace.product,
          selectedProductId,
          activeWorkspaceId: activeWorkspace.id,
          customerProfiles,
          nextNodes: getAddableNextNodeTypes(activeWorkspace, node.id).map((type) => ({ type, label: GROWTH_NODE_DEFINITIONS[type].shortTitle })),
          onRun: runNode,
          onApprove: approveNode,
          onArtifactChange: changeArtifact,
          onAiModelChange: changeAiModel,
          onSelectProduct: setSelectedProductId,
          onApplyProduct: applyProduct,
          onOpenCustomerProfile: openCustomerProfile,
          onCreateCustomerProfile: createCustomerProfile,
          onAddNext: addNextNode,
        },
      } as GrowthFlowNode;
    }));
    const fitKey = `${activeWorkspace.id}:${activeWorkspace.nodes.map((node) => node.id).join(",")}`;
    if (lastFitKeyRef.current !== fitKey) {
      lastFitKeyRef.current = fitKey;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        flowInstanceRef.current?.fitView({ padding: 0.24, minZoom: 0.5, maxZoom: 0.9, duration: 240 });
      }));
    }
  // Handler functions intentionally read the latest workspace snapshot; including their
  // render-local identities would turn this projection effect into a render loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, customerProfiles, products, selectedNodeId, selectedProductId, setFlowNodes]);

  const visibleIds = new Set(flowNodes.map((node) => node.id));
  const flowEdges: Edge[] = activeWorkspace
    ? activeWorkspace.edges
      .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
      .map((edge) => ({ ...edge, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }))
    : [];

  const handleNodesChange = useCallback((changes: NodeChange<StudioFlowNode>[]) => {
    onFlowNodesChange(changes);
    const changed = applyNodeChanges(changes, flowNodes);
    const positionChanges = changes.filter((change) => change.type === "position" && Boolean(change.position));
    if (!positionChanges.length) return;
    if (!activeWorkspace) return;
    const positions = new Map(changed.map((node) => [node.id, node.position]));
    const nodes = activeWorkspace.nodes.map((node) => ({ ...node, position: positions.get(node.id) || node.position }));
    const positionChanged = nodes.some((node, index) => {
      const previous = activeWorkspace.nodes[index]?.position;
      return !previous || previous.x !== node.position.x || previous.y !== node.position.y;
    });
    if (!positionChanged) return;
    updateWorkspace({
      ...activeWorkspace,
      nodes,
      updatedAt: new Date().toISOString(),
    });
  }, [activeWorkspace, flowNodes, onFlowNodesChange, updateWorkspace]);

  const handleNodeClick: NodeMouseHandler<StudioFlowNode> = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  async function performWorkspaceAction(body: Record<string, unknown>, workspaceId = activeWorkspace?.id) {
    if (!workspaceId) throw new Error("Không có workspace đang mở.");
    const response = await fetch(`/api/wholesale/growth-studio/${workspaceId}/actions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json() as { workspace?: GrowthStudioWorkspace; release?: { version: string }; checkpoint?: { id: string }; error?: string };
    if (!response.ok) throw new Error(payload.error || "Không thể hoàn tất hành động.");
    return payload;
  }

  async function settleAutosave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    ++saveVersionRef.current;
    await saveQueueRef.current;
    setIsSaving(false);
  }

  async function createCheckpoint() {
    const name = window.prompt("Tên checkpoint", `Chốt ${activeWorkspace?.title || "workspace"}`)?.trim();
    if (!name || !activeWorkspace) return;
    setBusyAction("checkpoint");
    try {
      const payload = await performWorkspaceAction({ action: "checkpoint", name });
      if (payload.checkpoint) updateWorkspace({ ...activeWorkspace, currentCheckpointId: payload.checkpoint.id });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tạo checkpoint."); }
    finally { setBusyAction(undefined); }
  }

  function openWorkspaceEditor(workspace: GrowthStudioWorkspace) {
    setWorkspaceEditor({ workspaceId: workspace.id, title: workspace.title, description: workspace.description || "" });
  }

  async function saveWorkspaceMetadata() {
    if (!workspaceEditor || !workspaceEditor.title.trim()) return;
    setBusyAction("update_metadata");
    try {
      await settleAutosave();
      const payload = await performWorkspaceAction({
        action: "update_metadata",
        title: workspaceEditor.title,
        description: workspaceEditor.description,
      }, workspaceEditor.workspaceId);
      if (payload.workspace) updateWorkspace(payload.workspace);
      setWorkspaceEditor(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật workspace.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function archiveWorkspace(workspace: GrowthStudioWorkspace) {
    setBusyAction("archive");
    try {
      await settleAutosave();
      const payload = await performWorkspaceAction({ action: "archive" }, workspace.id);
      if (payload.workspace) updateWorkspace(payload.workspace);
      if (workspace.id === activeId) {
        const next = workspaces.find((candidate) => candidate.id !== workspace.id && !candidate.archivedAt);
        setActiveId(next?.id || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu trữ workspace.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function restoreArchivedWorkspace(workspace: GrowthStudioWorkspace) {
    setBusyAction("unarchive");
    try {
      await settleAutosave();
      const payload = await performWorkspaceAction({ action: "unarchive" }, workspace.id);
      if (payload.workspace) updateWorkspace(payload.workspace);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể khôi phục workspace.");
    } finally {
      setBusyAction(undefined);
    }
  }

  function approveWorkspace() {
    if (!activeWorkspace) return;
    const approval = activeWorkspace.nodes.find((node) => node.type === "approval");
    if (!approval) { toast.error("Hãy hoàn thành flow và thêm node Kiểm tra & duyệt trước."); return; }
    const next = approveGrowthNode(activeWorkspace, approval.id);
    if (next === activeWorkspace) { toast.error("Các đầu vào bắt buộc chưa được duyệt."); return; }
    updateWorkspace(next);
  }

  async function releaseWorkspace() {
    setBusyAction("release");
    try {
      const payload = await performWorkspaceAction({ action: "release" });
      if (activeWorkspace && payload.release) updateWorkspace({ ...activeWorkspace, status: "released", currentReleaseVersion: payload.release.version });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tạo release."); }
    finally { setBusyAction(undefined); }
  }

  async function restoreRevision(revisionId: string) {
    try {
      const payload = await performWorkspaceAction({ action: "restore", revisionId });
      if (payload.workspace) updateWorkspace(payload.workspace);
      setHistoryOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể khôi phục revision.");
    }
  }

  if (isLoading) {
    return <div className="grid h-full min-h-[640px] place-items-center bg-bg-main"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;
  }

  return (
    <div className="growth-studio-shell">
      <GrowthStudioSidebar
        workspaces={workspaces}
        activeId={activeId}
        creating={isCreating}
        onOpen={openCustomerProfile}
        onCreate={createCustomerProfile}
        onEdit={openWorkspaceEditor}
        onArchive={archiveWorkspace}
        onRestore={restoreArchivedWorkspace}
      />
      {activeWorkspace ? <section className="growth-workspace-stage">
        <GrowthStudioHeader
          workspace={activeWorkspace} saving={isSaving} busyAction={busyAction}
          onHistory={() => { setHistoryTab("revisions"); setHistoryOpen(true); }}
          onCompare={() => { setHistoryTab("checkpoints"); setHistoryOpen(true); }}
          onCheckpoint={createCheckpoint} onEdit={() => openWorkspaceEditor(activeWorkspace)}
          onAutoLayout={() => applyLayout(layout)} onApprove={approveWorkspace} onRelease={releaseWorkspace}
        />
        <main className="growth-canvas">
        <ReactFlow<StudioFlowNode>
          key={activeId}
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={handleNodeClick}
          onInit={(instance) => {
            flowInstanceRef.current = instance;
            window.requestAnimationFrame(() => instance.fitView({ padding: 0.24, minZoom: 0.5, maxZoom: 0.9 }));
          }}
          nodesConnectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.24, minZoom: 0.5, maxZoom: 0.9 }}
          minZoom={0.2}
          maxZoom={1.4}
          aria-label="Canvas Growth Studio"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Panel position="top-left" className="growth-phase-legend" aria-label="Các phase của workflow">
            {GROWTH_PHASES.map((phase) => <span key={phase.id}>{phase.label}</span>)}
          </Panel>
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable ariaLabel="Bản đồ canvas" />
        </ReactFlow>
        </main>
      </section> : <main className="growth-workspace-welcome"><div><Plus aria-hidden="true" /><h1>Tạo workspace đầu tiên</h1><p>Chọn một mẫu để bắt đầu từ khách hàng, chiến lược hoặc một sản phẩm cụ thể.</p><button type="button" onClick={() => createCustomerProfile("product_social_launch_v1")}><Plus aria-hidden="true" />Workspace sản phẩm</button></div></main>}
      {activeWorkspace ? <GrowthStudioHistoryDrawer key={`${activeWorkspace.id}:${historyOpen}:${historyTab}`} workspaceId={activeWorkspace.id} open={historyOpen} initialTab={historyTab} onClose={() => setHistoryOpen(false)} onRestore={restoreRevision} /> : null}
      <dialog
        ref={workspaceDialogRef}
        className="growth-workspace-dialog"
        aria-labelledby="growth-workspace-dialog-title"
        onClose={() => setWorkspaceEditor(undefined)}
        onClick={(event) => { if (event.target === event.currentTarget) setWorkspaceEditor(undefined); }}
      >
        {workspaceEditor ? (
          <form method="dialog" onSubmit={(event) => { event.preventDefault(); void saveWorkspaceMetadata(); }}>
            <header>
              <div><h2 id="growth-workspace-dialog-title">Sửa workspace</h2><p>Thay đổi tên và mô tả hiển thị trong sidebar.</p></div>
              <button type="button" onClick={() => setWorkspaceEditor(undefined)} aria-label="Đóng">×</button>
            </header>
            <label>
              <span>Tên workspace</span>
              <input autoFocus required maxLength={120} value={workspaceEditor.title} onChange={(event) => setWorkspaceEditor((current) => current ? { ...current, title: event.target.value } : current)} />
            </label>
            <label>
              <span>Mô tả ngắn</span>
              <textarea rows={3} maxLength={240} value={workspaceEditor.description} onChange={(event) => setWorkspaceEditor((current) => current ? { ...current, description: event.target.value } : current)} />
              <small>{workspaceEditor.description.length}/240 ký tự</small>
            </label>
            <footer>
              <button type="button" onClick={() => setWorkspaceEditor(undefined)}>Hủy</button>
              <button type="submit" disabled={!workspaceEditor.title.trim() || busyAction === "update_metadata"}>{busyAction === "update_metadata" ? "Đang lưu…" : "Lưu thay đổi"}</button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
