"use client";

import { useMemo, useState } from "react";
import { Archive, ChevronDown, Clock3, FolderKanban, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Sparkles } from "lucide-react";
import type { GrowthStudioWorkspace, GrowthWorkspaceTemplateId } from "./growth-studio-contract";
import { GROWTH_WORKSPACE_TEMPLATES } from "./growth-studio-domain";

type Props = {
  workspaces: GrowthStudioWorkspace[];
  activeId: string | null;
  creating: boolean;
  onOpen: (workspaceId: string) => void;
  onCreate: (templateId: GrowthWorkspaceTemplateId) => void;
  onEdit: (workspace: GrowthStudioWorkspace) => void;
  onArchive: (workspace: GrowthStudioWorkspace) => void;
  onRestore: (workspace: GrowthStudioWorkspace) => void;
};

const statusLabel: Record<GrowthStudioWorkspace["status"], string> = {
  draft: "Nháp", processing: "Đang xử lý", in_review: "Chờ duyệt", approved: "Đã duyệt",
  stale: "Cần chạy lại", released: "Đã phát hành", failed: "Lỗi",
};

function WorkspaceRow({
  workspace,
  active,
  onOpen,
  onEdit,
  onArchive,
  onRestore,
}: {
  workspace: GrowthStudioWorkspace;
  active: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const safeId = workspace.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const menuId = `growth-workspace-menu-${safeId}`;
  const anchorName = `--growth-workspace-menu-${safeId}`;
  const runAndClose = (action: () => void) => {
    document.getElementById(menuId)?.hidePopover();
    action();
  };

  return (
    <div className="growth-workspace-row-wrap">
      <button type="button" className="growth-workspace-row" aria-current={active ? "page" : undefined} onClick={onOpen}>
        <span className="growth-workspace-row__name">{workspace.title}</span>
        <span className="growth-workspace-row__description">{workspace.description || workspace.product?.name || "Chưa có mô tả"}</span>
        <span className="growth-workspace-row__meta">
          <span>{statusLabel[workspace.status]}</span>
          <time dateTime={workspace.updatedAt}>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(workspace.updatedAt))}</time>
        </span>
      </button>
      <button
        type="button"
        className="growth-workspace-row__more"
        aria-label={`Quản lý ${workspace.title}`}
        aria-haspopup="menu"
        popoverTarget={menuId}
        style={{ anchorName }}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      <div id={menuId} className="growth-workspace-row__menu" role="menu" popover="auto" style={{ positionAnchor: anchorName }}>
        <button type="button" role="menuitem" onClick={() => runAndClose(onEdit)}><Pencil aria-hidden="true" />Sửa thông tin</button>
        {workspace.archivedAt
          ? <button type="button" role="menuitem" onClick={() => runAndClose(onRestore)}><RotateCcw aria-hidden="true" />Khôi phục</button>
          : <button type="button" role="menuitem" title="Chuyển vào mục Đã lưu trữ và có thể khôi phục" onClick={() => runAndClose(onArchive)}><Archive aria-hidden="true" />Xóa workspace</button>}
      </div>
    </div>
  );
}

export function GrowthStudioSidebar({ workspaces, activeId, creating, onOpen, onCreate, onEdit, onArchive, onRestore }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return normalized ? workspaces.filter((item) => `${item.title} ${item.description || ""}`.toLocaleLowerCase("vi").includes(normalized)) : workspaces;
  }, [query, workspaces]);
  const recent = filtered.filter((item) => !item.archivedAt).slice(0, 4);
  const strategy = filtered.filter((item) => !item.archivedAt && item.workspaceType === "STRATEGY_FOUNDATION");
  const products = filtered.filter((item) => !item.archivedAt && item.workspaceType !== "STRATEGY_FOUNDATION");
  const archived = filtered.filter((item) => Boolean(item.archivedAt));

  const section = (label: string, icon: typeof Clock3, items: GrowthStudioWorkspace[]) => {
    if (!items.length) return null;
    const Icon = icon;
    return (
      <section className="growth-workspace-section">
        <h2><Icon aria-hidden="true" />{label}<span>{items.length}</span></h2>
        <div>{items.map((workspace) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            active={workspace.id === activeId}
            onOpen={() => onOpen(workspace.id)}
            onEdit={() => onEdit(workspace)}
            onArchive={() => onArchive(workspace)}
            onRestore={() => onRestore(workspace)}
          />
        ))}</div>
      </section>
    );
  };

  return (
    <aside className="growth-workspace-sidebar" aria-label="Workspace Growth Studio">
      <div className="growth-workspace-sidebar__masthead">
        <p><Sparkles aria-hidden="true" />Growth Studio</p>
        <div className="growth-create-wrap">
          <button type="button" className="growth-create-button" popoverTarget="growth-template-menu" style={{ anchorName: "--growth-template-menu" }} disabled={creating}>
            <Plus aria-hidden="true" />{creating ? "Đang tạo…" : "Workspace mới"}<ChevronDown aria-hidden="true" />
          </button>
          <div id="growth-template-menu" className="growth-template-menu" role="menu" aria-label="Chọn mẫu workspace" popover="auto" style={{ positionAnchor: "--growth-template-menu" }}>
            {GROWTH_WORKSPACE_TEMPLATES.map((template) => (
              <button key={template.id} type="button" role="menuitem" title={template.label} onClick={() => { document.getElementById("growth-template-menu")?.hidePopover(); onCreate(template.id); }}>
                <strong>{template.label}</strong><span>{template.description}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="growth-workspace-search">
          <span>Tìm workspace</span>
          <span><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, segment hoặc occasion" /></span>
        </label>
      </div>
      <div className="growth-workspace-sidebar__list">
        {section("Gần đây", Clock3, recent)}
        {section("Nền tảng chiến lược", FolderKanban, strategy)}
        {section("Workspace sản phẩm", Sparkles, products)}
        {section("Đã lưu trữ", Archive, archived)}
        {!filtered.length ? <div className="growth-workspace-empty"><Search aria-hidden="true" /><p>Không có workspace phù hợp.</p><button type="button" onClick={() => setQuery("")}>Xóa tìm kiếm</button></div> : null}
      </div>
    </aside>
  );
}
