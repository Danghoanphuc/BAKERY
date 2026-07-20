"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, GitCompareArrows, History, Loader2, Milestone, RotateCcw, Rocket, X } from "lucide-react";
import type { GrowthHistory } from "./growth-studio-contract";
import { GROWTH_NODE_DEFINITIONS } from "./growth-studio-template";
import { semanticWorkspaceDiff } from "./growth-studio-domain";

type Tab = "revisions" | "runs" | "checkpoints" | "releases";
type Props = { workspaceId: string; open: boolean; initialTab?: Tab; onClose: () => void; onRestore: (revisionId: string) => Promise<void> };

const emptyHistory: GrowthHistory = { revisions: [], runs: [], checkpoints: [], releases: [] };

export function GrowthStudioHistoryDrawer({ workspaceId, open, initialTab = "revisions", onClose, onRestore }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [history, setHistory] = useState<GrowthHistory>(emptyHistory);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string>();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string>();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/admin/growth-studio/${workspaceId}/history`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { history?: GrowthHistory; error?: string };
        if (!response.ok || !payload.history) throw new Error(payload.error || "history_failed");
        if (!cancelled) setHistory(payload.history);
      })
      .catch((error: unknown) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Không thể tải lịch sử."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, workspaceId]);
  const items = useMemo(() => history[tab], [history, tab]);
  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const left = history.checkpoints.find((item) => item.id === compareIds[0]);
    const right = history.checkpoints.find((item) => item.id === compareIds[1]);
    return left && right ? semanticWorkspaceDiff(left.snapshot, right.snapshot) : null;
  }, [compareIds, history.checkpoints]);
  if (!open) return null;
  const tabs: Array<{ id: Tab; label: string; icon: typeof History }> = [
    { id: "revisions", label: "Thay đổi", icon: History }, { id: "runs", label: "AI Runs", icon: Bot },
    { id: "checkpoints", label: "Checkpoints", icon: Milestone }, { id: "releases", label: "Releases", icon: Rocket },
  ];
  return (
    <aside className="growth-history-drawer" aria-label="Lịch sử workspace">
      <header><div><p>Lịch sử workspace</p><span>Mỗi lần restore tạo một revision mới.</span></div><button type="button" onClick={onClose} aria-label="Đóng lịch sử"><X aria-hidden="true" /></button></header>
      <div className="growth-history-tabs" role="tablist">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}><Icon aria-hidden="true" />{item.label}</button>; })}</div>
      <div className="growth-history-list">
        {comparison ? <div className="growth-history-diff" role="status"><strong>Semantic diff</strong><p>{comparison.titleChanged ? "Tên workspace đã đổi. " : ""}{comparison.contextChanged ? "Context đã đổi. " : ""}{comparison.changedNodes.length} node có thay đổi có ý nghĩa.</p><ul>{comparison.changedNodes.map((item) => <li key={item.nodeId}>{GROWTH_NODE_DEFINITIONS[item.nodeId as keyof typeof GROWTH_NODE_DEFINITIONS]?.title || item.nodeId}: {item.type === "added" ? "được thêm" : item.fields?.join(", ")}</li>)}</ul></div> : null}
        {loading ? <div className="growth-history-loading"><Loader2 aria-hidden="true" />Đang tải lịch sử…</div> : null}
        {!loading && loadError ? <div className="growth-history-empty" role="alert"><History aria-hidden="true" /><p>{loadError}</p></div> : null}
        {!loading && !loadError && !items.length ? <div className="growth-history-empty"><History aria-hidden="true" /><p>Chưa có dữ liệu trong mục này.</p></div> : null}
        {!loading && tab === "revisions" ? history.revisions.map((item) => <article key={item.id}><div><strong>{item.kind === "autosave" ? "Tự động lưu" : item.kind === "restore" ? "Khôi phục" : "Revision"}</strong><time>{formatDate(item.createdAt)}</time></div><p>{item.createdBy} · {item.snapshot.nodes.length} node</p><button type="button" disabled={restoring === item.id} onClick={async () => { setRestoring(item.id); try { await onRestore(item.id); } finally { setRestoring(undefined); } }}><RotateCcw aria-hidden="true" />{restoring === item.id ? "Đang khôi phục…" : "Khôi phục thành revision mới"}</button></article>) : null}
        {!loading && tab === "runs" ? history.runs.map((item) => <article key={item.id}><div><strong>{GROWTH_NODE_DEFINITIONS[item.nodeType]?.title || item.nodeType}</strong><time>{formatDate(item.startedAt)}</time></div><p>{item.modelId} · prompt {item.promptVersion}</p><code>{item.inputHash.slice(0, 16)}…</code>{item.error ? <small>{item.error}</small> : null}</article>) : null}
        {!loading && tab === "checkpoints" ? history.checkpoints.map((item) => <article key={item.id}><div><strong>{item.name}</strong><time>{formatDate(item.createdAt)}</time></div><p>{item.createdBy} · {item.snapshot.nodes.length} node</p><button type="button" aria-pressed={compareIds.includes(item.id)} onClick={() => setCompareIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.slice(-1), item.id])}><GitCompareArrows aria-hidden="true" />{compareIds.includes(item.id) ? "Đã chọn" : "Chọn để so sánh"}</button></article>) : null}
        {!loading && tab === "releases" ? history.releases.map((item) => <article key={item.id}><div><strong>{item.version}</strong><time>{formatDate(item.publishedAt)}</time></div><p>Bất biến · duyệt bởi {item.approvedBy}</p></article>) : null}
      </div>
    </aside>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
