"use client";

import {
  Check,
  GitCompareArrows,
  History,
  LayoutTemplate,
  Milestone,
  MoreHorizontal,
  Pencil,
  Rocket,
} from "lucide-react";
import type { GrowthStudioWorkspace } from "./growth-studio-contract";

type Props = {
  workspace: GrowthStudioWorkspace;
  saving: boolean;
  busyAction?: string;
  onHistory: () => void;
  onCompare: () => void;
  onCheckpoint: () => void;
  onEdit: () => void;
  onAutoLayout: () => void;
  onApprove: () => void;
  onRelease: () => void;
};

const statusLabel: Record<GrowthStudioWorkspace["status"], string> = {
  draft: "Nháp", processing: "Đang xử lý", in_review: "Chờ duyệt", approved: "Đã duyệt",
  stale: "Cần chạy lại", released: "Đã phát hành", failed: "Lỗi",
};

export function GrowthStudioHeader({
  workspace,
  saving,
  busyAction,
  onHistory,
  onCompare,
  onCheckpoint,
  onEdit,
  onAutoLayout,
  onApprove,
  onRelease,
}: Props) {
  const checkpoint = workspace.currentReleaseVersion
    || workspace.currentVersion
    || (workspace.currentCheckpointId ? "Checkpoint" : "Bản nháp");
  const typeLabel = workspace.workspaceType === "STRATEGY_FOUNDATION" ? "Nền tảng chiến lược" : "Workspace sản phẩm";
  const menuActions = [
    { id: "compare", label: "So sánh checkpoint", icon: GitCompareArrows, onClick: onCompare },
    { id: "checkpoint", label: "Tạo checkpoint", icon: Milestone, onClick: onCheckpoint },
    { id: "edit", label: "Sửa thông tin", icon: Pencil, onClick: onEdit },
    { id: "approve", label: "Duyệt workspace", icon: Check, onClick: onApprove },
    { id: "release", label: "Tạo release", icon: Rocket, onClick: onRelease },
  ];

  return (
    <header className="growth-workspace-header">
      <div className="growth-workspace-header__identity">
        <div>
          <h1>{workspace.title}</h1>
          <button type="button" onClick={onEdit} aria-label="Sửa thông tin workspace"><Pencil aria-hidden="true" /></button>
        </div>
        <p>{typeLabel}{workspace.context?.status === "needs_confirmation" ? " · Cần xác nhận context" : ""}</p>
      </div>

      <div className="growth-workspace-header__summary" aria-label="Trạng thái workspace">
        <span data-tone={saving ? "working" : "ok"}>{saving ? "Đang lưu" : "Đã lưu"}</span>
        <span data-tone={workspace.archivedAt ? "archived" : workspace.status}>{workspace.archivedAt ? "Đã xóa" : statusLabel[workspace.status]}</span>
        <span>{checkpoint}</span>
        <time dateTime={workspace.updatedAt}>
          {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(workspace.updatedAt))}
        </time>
      </div>

      <nav className="growth-workspace-header__actions" aria-label="Hành động workspace">
        <button type="button" onClick={onHistory} disabled={Boolean(busyAction)}><History aria-hidden="true" />Lịch sử</button>
        <button type="button" onClick={onAutoLayout} disabled={Boolean(busyAction)}><LayoutTemplate aria-hidden="true" />Auto layout</button>
        <div className="growth-header-more">
          <button type="button" aria-haspopup="menu" popoverTarget="growth-header-more-menu" style={{ anchorName: "--growth-header-more-menu" }} disabled={Boolean(busyAction)}>
            <MoreHorizontal aria-hidden="true" />{busyAction ? "Đang xử lý…" : "Thêm"}
          </button>
          <div id="growth-header-more-menu" className="growth-header-more__menu" role="menu" popover="auto" style={{ positionAnchor: "--growth-header-more-menu" }}>
            {menuActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.id} type="button" role="menuitem" onClick={() => { document.getElementById("growth-header-more-menu")?.hidePopover(); action.onClick(); }}>
                  <Icon aria-hidden="true" />{action.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
