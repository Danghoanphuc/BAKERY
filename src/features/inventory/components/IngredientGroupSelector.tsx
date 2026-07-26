/* Hallmark · genre: editorial · macrostructure: Workbench · design-system: design.md · designed-as-app */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { IngredientGroup, IngredientGroupInput } from "@/types";

export type IngredientGroupSelection = {
  groupId: string;
  subgroupId: string;
  displayName: string;
  defaultStorage?: string;
  defaultShelfLife?: string;
};

type Props = {
  groupId: string;
  subgroupId: string;
  legacyValue?: string;
  onChange: (selection: IngredientGroupSelection) => void;
  apiPath?: string;
};

const controlClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 pr-9 text-sm text-neutral-950 outline-2 outline-transparent outline-offset-1 transition-colors placeholder:text-neutral-400 hover:bg-neutral-50 focus-visible:border-neutral-400 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-60";

const emptyDraft: IngredientGroupInput = {
  name: "",
  code: "",
  parentId: null,
  isActive: true,
  displayOrder: 0,
  defaultStorage: "",
  defaultShelfLife: "",
};

export function IngredientGroupSelector({
  groupId,
  subgroupId,
  legacyValue = "",
  onChange,
  apiPath,
}: Props) {
  const resolvedApiPath =
    apiPath ??
    (typeof window !== "undefined" &&
    window.location.pathname.startsWith("/wholesale")
      ? "/api/wholesale/inventory/ingredient-groups"
      : "/api/admin/inventory/ingredient-groups");
  const [groups, setGroups] = useState<IngredientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(resolvedApiPath, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | IngredientGroup[]
        | { error?: string }
        | null;
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          !Array.isArray(payload) && payload?.error
            ? payload.error
            : "Không thể tải nhóm nguyên liệu.",
        );
      }
      setGroups(payload);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải nhóm nguyên liệu.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [resolvedApiPath]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const roots = useMemo(
    () => groups.filter((group) => !group.parentId),
    [groups],
  );
  const subgroups = useMemo(
    () => groups.filter((group) => group.parentId === groupId),
    [groupId, groups],
  );

  const choose = (nextGroupId: string, nextSubgroupId = "") => {
    const root = groups.find((group) => group.id === nextGroupId);
    const child = groups.find((group) => group.id === nextSubgroupId);
    const source = child ?? root;
    onChange({
      groupId: nextGroupId,
      subgroupId: nextSubgroupId,
      displayName: source?.name ?? "",
      defaultStorage:
        source?.defaultStorage || root?.defaultStorage || undefined,
      defaultShelfLife:
        source?.defaultShelfLife || root?.defaultShelfLife || undefined,
    });
  };

  return (
    <>
      <div className="space-y-3 rounded-xl bg-neutral-50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <FolderTree className="h-4 w-4 text-brand-600" />
            Phân loại hai cấp
          </p>
          <button
            type="button"
            onClick={() => setIsManaging(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100"
          >
            <Settings2 className="h-4 w-4" />
            Quản lý danh mục
          </button>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-bold text-neutral-600">
              Nhóm chính
            </span>
            <select
              value={groupId}
              disabled={isLoading}
              onChange={(event) => choose(event.target.value)}
              className={controlClass}
              aria-label="Nhóm nguyên liệu chính"
            >
              <option value="">
                {isLoading
                  ? "Đang tải nhóm…"
                  : legacyValue && !groupId
                    ? `Dữ liệu cũ: ${legacyValue}`
                    : "Chọn nhóm chính"}
              </option>
              {roots
                .filter((group) => group.isActive || group.id === groupId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {!group.isActive ? " · Ngừng hoạt động" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-bold text-neutral-600">
              Nhóm con
            </span>
            <select
              value={subgroupId}
              disabled={!groupId || isLoading}
              onChange={(event) => choose(groupId, event.target.value)}
              className={controlClass}
              aria-label="Nhóm nguyên liệu con"
            >
              <option value="">Không chọn nhóm con</option>
              {subgroups
                .filter((group) => group.isActive || group.id === subgroupId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {!group.isActive ? " · Ngừng hoạt động" : ""}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="text-xs leading-5 text-neutral-500">
          Nhóm chính dùng cho báo cáo; nhóm con dùng để lọc chi tiết.
        </p>
      </div>

      {isManaging && (
        <IngredientGroupManager
          apiPath={resolvedApiPath}
          groups={groups}
          onClose={() => setIsManaging(false)}
          onChanged={async () => {
            await load();
          }}
        />
      )}
    </>
  );
}

export function IngredientGroupManagerDialog({
  isOpen,
  onClose,
  apiPath,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiPath: string;
}) {
  const [groups, setGroups] = useState<IngredientGroup[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(apiPath, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | IngredientGroup[]
        | { error?: string }
        | null;
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          !Array.isArray(payload) && payload?.error
            ? payload.error
            : "Không thể tải nhóm nguyên liệu.",
        );
      }
      setGroups(payload);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải nhóm nguyên liệu.",
      );
    }
  }, [apiPath]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, load]);

  if (!isOpen) return null;

  return (
    <IngredientGroupManager
      apiPath={apiPath}
      groups={groups}
      onClose={onClose}
      onChanged={load}
    />
  );
}

function IngredientGroupManager({
  apiPath,
  groups,
  onClose,
  onChanged,
}: {
  apiPath: string;
  groups: IngredientGroup[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const roots = groups.filter((group) => !group.parentId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState<IngredientGroupInput>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = groups.filter((group) =>
    `${group.name} ${group.code}`
      .toLocaleLowerCase("vi")
      .includes(query.trim().toLocaleLowerCase("vi")),
  );
  const visibleRootIds = new Set(
    filtered.map((group) => group.parentId || group.id),
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const closeDialog = () => dialogRef.current?.close();

  const startEdit = (group: IngredientGroup) => {
    setEditingId(group.id);
    setDraft({
      name: group.name,
      code: group.code,
      parentId: group.parentId,
      isActive: group.isActive,
      displayOrder: group.displayOrder,
      defaultStorage: group.defaultStorage ?? "",
      defaultShelfLife: group.defaultShelfLife ?? "",
    });
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      toast.error("Vui lòng nhập tên nhóm.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        editingId ? `${apiPath}/${editingId}` : apiPath,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể lưu nhóm nguyên liệu.");
      }
      toast.success(
        editingId
          ? "Đã cập nhật nhóm nguyên liệu."
          : draft.parentId
            ? "Đã tạo nhóm nguyên liệu con."
            : "Đã tạo nhóm nguyên liệu chính.",
      );
      if (!editingId) resetDraft();
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu nhóm nguyên liệu.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (group: IngredientGroup) => {
    setBusyId(group.id);
    try {
      const response = await fetch(`${apiPath}/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...group, isActive: !group.isActive }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể đổi trạng thái nhóm.");
      }
      if (editingId === group.id) {
        setDraft((current) => ({
          ...current,
          isActive: !group.isActive,
        }));
      }
      toast.success(
        group.isActive
          ? "Đã ngừng hoạt động nhóm nguyên liệu."
          : "Đã kích hoạt nhóm nguyên liệu.",
      );
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể đổi trạng thái nhóm.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể xóa nhóm.");
      }
      setDeleteCandidateId(null);
      resetDraft();
      toast.success("Đã xóa nhóm nguyên liệu.");
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa nhóm.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Quản lý nhóm nguyên liệu"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      className="m-auto h-[min(48rem,calc(100dvh-2rem))] w-[min(72rem,calc(100%-2rem))] max-w-none overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/55 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
              Nhóm nguyên liệu
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
              Chọn một nhóm để chỉnh sửa, hoặc tạo nhóm mới. Danh mục chỉ có
              tối đa hai cấp.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(14rem,0.8fr)_minmax(20rem,1.2fr)] lg:grid-cols-[minmax(19rem,0.9fr)_minmax(24rem,1.1fr)] lg:grid-rows-1">
          <section className="flex min-h-0 flex-col border-b border-neutral-200 bg-neutral-50 lg:border-b-0 lg:border-r">
            <div className="shrink-0 space-y-3 border-b border-neutral-200 p-4 sm:p-5">
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-bg-card transition-colors hover:bg-brand-700 active:bg-brand-800"
              >
                <Plus className="h-4 w-4" />
                Tạo nhóm mới
              </button>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${controlClass} pl-10`}
                  placeholder="Tìm tên hoặc mã nhóm…"
                  aria-label="Tìm nhóm nguyên liệu"
                />
              </label>
              <p className="text-xs font-semibold text-neutral-500">
                {groups.length} nhóm · {roots.length} nhóm chính
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
              {roots
                .filter((root) => visibleRootIds.has(root.id))
                .map((root) => {
                  const children = groups.filter(
                    (group) =>
                      group.parentId === root.id &&
                      filtered.some((item) => item.id === group.id),
                  );
                  const showRoot = filtered.some((item) => item.id === root.id);
                  return (
                    <div key={root.id} className="mb-1">
                      {showRoot && (
                        <GroupListButton
                          group={root}
                          isSelected={editingId === root.id}
                          childCount={
                            groups.filter(
                              (group) => group.parentId === root.id,
                            ).length
                          }
                          onClick={() => startEdit(root)}
                        />
                      )}
                      {children.map((child) => (
                        <GroupListButton
                          key={child.id}
                          group={child}
                          isSelected={editingId === child.id}
                          isChild
                          onClick={() => startEdit(child)}
                        />
                      ))}
                    </div>
                  );
                })}
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-bold text-neutral-700">
                    Không tìm thấy nhóm
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Thử tên khác hoặc tạo một nhóm mới.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto p-5 sm:p-6 lg:p-7">
            <div className="mx-auto max-w-xl">
              <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {editingId ? (
                      <Pencil className="h-4 w-4 text-brand-600" />
                    ) : (
                      <Plus className="h-4 w-4 text-brand-600" />
                    )}
                    <h3 className="font-display text-xl font-semibold text-neutral-950">
                      {editingId ? "Chỉnh sửa nhóm" : "Tạo nhóm mới"}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Mã nhóm dùng trong báo cáo và không nên thay đổi thường
                    xuyên.
                  </p>
                </div>
                {editingId && (
                  <span
                    className={
                      draft.isActive !== false
                        ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                        : "shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
                    }
                  >
                    {draft.isActive !== false
                      ? "Đang hoạt động"
                      : "Đã ngừng"}
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <EditorField label="Tên nhóm" required>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={controlClass}
                      placeholder="Ví dụ: Bột mì"
                      aria-required="true"
                    />
                  </EditorField>
                </div>
                <EditorField label="Mã nhóm">
                  <input
                    value={draft.code ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    className={`${controlClass} font-mono`}
                    placeholder="Tự sinh nếu để trống"
                  />
                </EditorField>
                <EditorField label="Nhóm cha">
                  <select
                    value={draft.parentId ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        parentId: event.target.value || null,
                      }))
                    }
                    className={controlClass}
                  >
                    <option value="">Không có · Nhóm chính</option>
                    {roots
                      .filter((group) => group.id !== editingId)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                </EditorField>
                <div className="sm:col-span-2">
                  <EditorField label="Bảo quản mặc định">
                    <input
                      value={draft.defaultStorage ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          defaultStorage: event.target.value,
                        }))
                      }
                      className={controlClass}
                      placeholder="Ví dụ: Khô ráo, tránh ánh nắng"
                    />
                  </EditorField>
                </div>
                <div className="sm:col-span-2">
                  <EditorField label="Hạn sử dụng mặc định">
                    <input
                      value={draft.defaultShelfLife ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          defaultShelfLife: event.target.value,
                        }))
                      }
                      className={controlClass}
                      placeholder="Ví dụ: 6 tháng"
                    />
                  </EditorField>
                </div>
              </div>

              <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl bg-neutral-50 px-3.5 text-sm font-semibold text-neutral-700">
                <input
                  type="checkbox"
                  checked={draft.isActive !== false}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 accent-brand-600"
                />
                Cho phép chọn nhóm này khi tạo nguyên liệu
              </label>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteCandidateId(
                          deleteCandidateId === editingId ? null : editingId,
                        )
                      }
                      className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa nhóm
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-bg-card transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isSaving
                    ? "Đang lưu…"
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo nhóm"}
                </button>
              </div>

              {editingId && deleteCandidateId === editingId && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800">
                    Xóa vĩnh viễn nhóm này?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-red-700">
                    Chỉ nhóm chưa có nhóm con và chưa được nguyên liệu sử dụng
                    mới có thể xóa.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteCandidateId(null)}
                      className="h-11 whitespace-nowrap rounded-lg px-3 text-sm font-bold text-neutral-700 hover:bg-white"
                    >
                      Giữ lại
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(editingId)}
                      disabled={busyId === editingId}
                      className="h-11 whitespace-nowrap rounded-lg bg-red-700 px-4 text-sm font-bold text-bg-card hover:bg-red-800 disabled:opacity-50"
                    >
                      Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              )}

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    const group = groups.find(
                      (item) => item.id === editingId,
                    );
                    if (group) void toggleStatus(group);
                  }}
                  disabled={busyId === editingId}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-bold text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
                >
                  {draft.isActive !== false
                    ? "Ngừng hoạt động nhóm"
                    : "Kích hoạt lại nhóm"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </dialog>
  );
}

function GroupListButton({
  group,
  isSelected,
  isChild = false,
  childCount,
  onClick,
}: {
  group: IngredientGroup;
  isSelected: boolean;
  isChild?: boolean;
  childCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
        isSelected
          ? "bg-brand-100 text-brand-900"
          : "text-neutral-700 hover:bg-white"
      } ${isChild ? "pl-8" : ""}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          group.isActive ? "bg-emerald-500" : "bg-neutral-300"
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{group.name}</span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-neutral-500">
          {group.code}
          {typeof childCount === "number" && childCount > 0
            ? ` · ${childCount} nhóm con`
            : ""}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
    </button>
  );
}

function EditorField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-neutral-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
