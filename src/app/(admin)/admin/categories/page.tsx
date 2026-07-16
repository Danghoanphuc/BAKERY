"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Network,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Category } from "@/types";
import { CategoryMap } from "./_components/CategoryMap";

type CategoryFormData = {
  name: string;
  iconUrl: string;
  displayOrder: number;
  isVisible: boolean;
};

type FilterMode = "all" | "visible" | "hidden" | "empty";
type ViewMode = "board" | "preview" | "map";

const emptyForm: CategoryFormData = {
  name: "",
  iconUrl: "",
  displayOrder: 0,
  isVisible: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const categoriesOrderRef = useRef<Category[]>([]);
  const didDragChangeRef = useRef(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null);
  const [moveTargetId, setMoveTargetId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error(`categories_load_${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("categories_payload_invalid");
      }

      setCategories(data);
      categoriesOrderRef.current = data;
      setHasUnsavedOrder(false);
      setError(null);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Không thể tải danh sách danh mục.");
      setCategories([]);
      categoriesOrderRef.current = [];
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCategories = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesKeyword = category.name.toLowerCase().includes(keyword);
      const isVisible = category.isVisible ?? true;
      const productCount = category.productCount ?? 0;

      if (!matchesKeyword) return false;
      if (filter === "visible") return isVisible;
      if (filter === "hidden") return !isVisible;
      if (filter === "empty") return productCount === 0;
      return true;
    });
  }, [categories, filter, query]);

  const stats = useMemo(() => {
    return {
      total: categories.length,
      visible: categories.filter((category) => category.isVisible ?? true).length,
      hidden: categories.filter((category) => !(category.isVisible ?? true)).length,
      products: categories.reduce(
        (sum, category) => sum + (category.productCount ?? 0),
        0,
      ),
      activeProducts: categories.reduce(
        (sum, category) => sum + (category.activeProductCount ?? 0),
        0,
      ),
      outOfStock: categories.reduce(
        (sum, category) => sum + (category.outOfStockProductCount ?? 0),
        0,
      ),
    };
  }, [categories]);

  const availableMoveTargets = useMemo(
    () =>
      categories.filter((category) => category.id !== deleteCandidate?.id),
    [categories, deleteCandidate],
  );

  function handleOpenAddModal() {
    setEditingCategory(null);
    setFormData({
      ...emptyForm,
      iconUrl: "",
      displayOrder: categories.length,
    });
    setIsModalOpen(true);
  }

  function handleOpenEditModal(category: Category) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      iconUrl: category.iconUrl,
      displayOrder: category.displayOrder ?? 0,
      isVisible: category.isVisible ?? true,
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (!formData.name.trim()) {
      setIsSaving(false);
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    if (!formData.iconUrl.trim()) {
      setIsSaving(false);
      setError("Vui lòng tải lên ảnh danh mục.");
      return;
    }

    try {
      const response = await fetch(
        editingCategory
          ? `/api/categories/${editingCategory.id}`
          : "/api/categories",
        {
          method: editingCategory ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            name: formData.name.trim(),
            iconUrl: formData.iconUrl.trim(),
          }),
        },
      );

      if (!response.ok) throw new Error("save_failed");

      setIsModalOpen(false);
      setMessage(editingCategory ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
      await loadData();
    } catch (err) {
      console.error("Failed to save category:", err);
      setError("Không thể lưu danh mục.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleVisibility(category: Category) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isVisible: !(category.isVisible ?? true),
        }),
      });

      if (!response.ok) throw new Error("visibility_failed");

      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? { ...item, isVisible: !(category.isVisible ?? true) }
            : item,
        ),
      );
      setMessage("Đã cập nhật trạng thái hiển thị.");
    } catch (err) {
      console.error("Failed to update category visibility:", err);
      setError("Không thể cập nhật trạng thái hiển thị.");
    } finally {
      setIsSaving(false);
    }
  }

  function moveCategory(activeId: string, overId: string) {
    if (activeId === overId) return;

    setCategories((current) => {
      const activeIndex = current.findIndex((item) => item.id === activeId);
      const overIndex = current.findIndex((item) => item.id === overId);
      if (activeIndex < 0 || overIndex < 0) return current;

      const next = [...current];
      const [activeItem] = next.splice(activeIndex, 1);
      next.splice(overIndex, 0, activeItem);
      const reordered = next.map((item, index) => ({
        ...item,
        displayOrder: index,
      }));
      categoriesOrderRef.current = reordered;
      didDragChangeRef.current = true;
      return reordered;
    });
    setHasUnsavedOrder(true);
  }

  function startDrag(event: DragEvent<HTMLDivElement>, categoryId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
    draggingIdRef.current = categoryId;
    setDraggingId(categoryId);
    setError(null);
    setMessage(null);
  }

  function moveDraggedCategory(event: DragEvent<HTMLDivElement>, overId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const activeId = draggingIdRef.current;
    if (!activeId) return;
    if (overId !== activeId) {
      moveCategory(activeId, overId);
    }
  }

  function endDrag() {
    draggingIdRef.current = null;
    setDraggingId(null);
    if (didDragChangeRef.current) {
      didDragChangeRef.current = false;
      void saveOrder(categoriesOrderRef.current, true);
    }
  }

  async function saveOrder(
    orderedCategories = categoriesOrderRef.current.length
      ? categoriesOrderRef.current
      : categories,
    silent = false,
  ) {
    setIsSaving(true);
    setError(null);
    if (!silent) setMessage(null);

    try {
      const response = await fetch("/api/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderedCategories.map((category, index) => ({
            id: category.id,
            displayOrder: index,
          })),
        }),
      });

      if (!response.ok) throw new Error("reorder_failed");
      setHasUnsavedOrder(false);
      setMessage(
        silent
          ? "Đã tự lưu thứ tự hiển thị."
          : "Đã lưu thứ tự hiển thị.",
      );
      await loadData();
    } catch (err) {
      console.error("Failed to reorder categories:", err);
      setError("Không thể lưu thứ tự danh mục.");
      // Resync UI with server so local drag order does not drift.
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (response.status === 409) {
        setDeleteCandidate(category);
        setMoveTargetId(
          categories.find((item) => item.id !== category.id)?.id ?? "",
        );
        return;
      }

      if (!response.ok) throw new Error("delete_failed");

      setMessage("Đã xóa danh mục.");
      await loadData();
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError("Không thể xóa danh mục.");
    } finally {
      setIsSaving(false);
    }
  }

  async function moveProductsAndDelete() {
    if (!deleteCandidate || !moveTargetId) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const moveResponse = await fetch(
        `/api/categories/${deleteCandidate.id}/move-products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toCategoryId: moveTargetId }),
        },
      );
      if (!moveResponse.ok) throw new Error("move_failed");

      const deleteResponse = await fetch(`/api/categories/${deleteCandidate.id}`, {
        method: "DELETE",
      });
      if (!deleteResponse.ok) throw new Error("delete_failed");

      setDeleteCandidate(null);
      setMoveTargetId("");
      setMessage("Đã chuyển sản phẩm và xóa danh mục.");
      await loadData();
    } catch (err) {
      console.error("Failed to move products and delete category:", err);
      setError("Không thể chuyển sản phẩm hoặc xóa danh mục.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Quản lý danh mục
          </h1>
          <p className="mt-1 text-neutral-600">
            Sắp xếp danh mục, kiểm soát hiển thị và theo dõi sản phẩm theo nhóm.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasUnsavedOrder && (
            <button
              onClick={() => saveOrder()}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownUp className="h-4 w-4" />
              )}
              Lưu thứ tự
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Danh mục" value={stats.total.toString()} />
        <StatCard label="Đang hiển thị" value={stats.visible.toString()} />
        <StatCard label="Sản phẩm đang bán" value={stats.activeProducts.toString()} />
        <StatCard label="Hết hàng" value={stats.outOfStock.toString()} tone="warn" />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm danh mục..."
              className="h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <div className="grid grid-cols-4 rounded-lg border border-neutral-200 p-1 text-sm">
            {[
              ["all", "Tất cả"],
              ["visible", "Hiện"],
              ["hidden", "Ẩn"],
              ["empty", "Rỗng"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as FilterMode)}
                className={`rounded-md px-3 py-2 font-semibold ${
                  filter === value
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 rounded-lg border border-neutral-200 p-1">
            <button
              onClick={() => setViewMode("board")}
              className={`grid h-8 w-10 place-items-center rounded-md ${
                viewMode === "board"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
              aria-label="Dạng danh sách"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`grid h-8 w-10 place-items-center rounded-md ${
                viewMode === "preview"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
              aria-label="Dạng xem trước"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`grid h-8 w-10 place-items-center rounded-md ${
                viewMode === "map"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
              aria-label="Dạng bản đồ vận hành"
              title="Bản đồ vận hành"
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-500">
          Đang tải danh mục...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-500">
          Không có danh mục phù hợp.
        </div>
      ) : viewMode === "board" ? (
        <div className="space-y-3">
          {filteredCategories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              index={index}
              isDragging={draggingId === category.id}
              onDragStart={startDrag}
              onDragMove={moveDraggedCategory}
              onDragEnd={endDrag}
              onEdit={handleOpenEditModal}
              onDelete={deleteCategory}
              onToggleVisibility={toggleVisibility}
              isSaving={isSaving}
            />
          ))}
        </div>
      ) : viewMode === "preview" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCategories.map((category) => (
            <PreviewCard
              key={category.id}
              category={category}
              onEdit={handleOpenEditModal}
              onDelete={deleteCategory}
              onToggleVisibility={toggleVisibility}
              isSaving={isSaving}
            />
          ))}
        </div>
      ) : (
        <CategoryMap
          categories={filteredCategories}
          isSaving={isSaving}
          onEdit={handleOpenEditModal}
          onDelete={deleteCategory}
          onToggleVisibility={toggleVisibility}
        />
      )}

      {isModalOpen && (
        <CategoryModal
          editingCategory={editingCategory}
          formData={formData}
          setFormData={setFormData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          error={error}
        />
      )}

      {deleteCandidate && (
        <MoveProductsModal
          category={deleteCandidate}
          targets={availableMoveTargets}
          targetId={moveTargetId}
          setTargetId={setMoveTargetId}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={moveProductsAndDelete}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "warn" ? "text-amber-600" : "text-neutral-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CategoryRow({
  category,
  index,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onEdit,
  onDelete,
  onToggleVisibility,
  isSaving,
}: {
  category: Category;
  index: number;
  isDragging: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragMove: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleVisibility: (category: Category) => void;
  isSaving: boolean;
}) {
  const isVisible = category.isVisible ?? true;

  return (
    <div
      data-category-id={category.id}
      draggable
      onDragStart={(event) => onDragStart(event, category.id)}
      onDragOver={(event) => onDragMove(event, category.id)}
      onDragEnd={onDragEnd}
      className={`grid gap-4 rounded-lg border bg-white p-4 shadow-sm transition-all duration-200 md:grid-cols-[auto_1fr_auto] md:items-center ${
        isDragging
          ? "z-20 scale-[1.02] cursor-grabbing border-brand-400 opacity-90 shadow-2xl"
          : "border-neutral-200 hover:shadow-md"
      } ${!isVisible ? "opacity-65" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab rounded-md border border-neutral-200 p-2 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-700 active:cursor-grabbing"
          aria-label="Kéo để sắp xếp"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
          {index + 1}
        </div>
        <ImagePreview src={category.iconUrl} alt={category.name} size="lg" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-bold text-neutral-900">
            {category.name}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isVisible
                ? "bg-green-100 text-green-700"
                : "bg-neutral-200 text-neutral-600"
            }`}
          >
            {isVisible ? "Đang hiển thị" : "Đang ẩn"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <PackageCheck className="h-3.5 w-3.5" />
            {category.activeProductCount ?? 0} đang bán
          </span>
          <span className="inline-flex items-center gap-1">
            <PackageX className="h-3.5 w-3.5" />
            {category.outOfStockProductCount ?? 0} hết hàng
          </span>
          <span>{category.productCount ?? 0} sản phẩm tổng</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => onToggleVisibility(category)}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isVisible ? "Ẩn" : "Hiện"}
        </button>
        <button
          onClick={() => onEdit(category)}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          <Edit2 className="h-4 w-4" />
          Sửa
        </button>
        <button
          onClick={() => onDelete(category)}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Xóa
        </button>
      </div>
    </div>
  );
}

function PreviewCard({
  category,
  onEdit,
  onDelete,
  onToggleVisibility,
  isSaving,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleVisibility: (category: Category) => void;
  isSaving: boolean;
}) {
  const isVisible = category.isVisible ?? true;

  return (
    <div className={`group overflow-hidden rounded-[10px] border border-[#f0d8c2] bg-[#fff7ed] shadow-sm ${!isVisible ? "opacity-55" : ""}`}>
      <div className="min-h-[42px] px-2 pt-2 text-[12px] font-black leading-tight text-[#542413]">{category.name}</div>
      <div className="relative aspect-square bg-neutral-100">
        <img
          src={category.iconUrl}
          alt={category.name}
          className="h-full w-full object-cover"
        />
        {!isVisible && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-neutral-900/75 px-2 py-0.5 text-[9px] font-bold text-white">Ẩn</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 border-t border-[#f0d8c2] p-1.5">
        <span className="truncate text-[9px] font-bold text-[#8a6855]">{category.productCount ?? 0} sản phẩm</span>
        <div className="flex gap-1">
        <button
          onClick={() => onToggleVisibility(category)}
          disabled={isSaving}
          className="rounded-md bg-white p-1.5 text-neutral-600 disabled:opacity-60"
          aria-label="Bật tắt hiển thị"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onEdit(category)}
          className="rounded-md bg-white p-1.5 text-brand-600"
          aria-label="Sửa"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(category)}
          disabled={isSaving}
          className="rounded-md bg-white p-1.5 text-red-600 disabled:opacity-60"
          aria-label="Xóa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({
  editingCategory,
  formData,
  setFormData,
  onClose,
  onSubmit,
  isSaving,
  error,
}: {
  editingCategory: Category | null;
  formData: CategoryFormData;
  setFormData: (data: CategoryFormData) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/cloudinary", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Không thể tải ảnh.");
      setFormData({ ...formData, iconUrl: result.url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Không thể tải ảnh.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Chọn ảnh và xem trước cách danh mục xuất hiện ngoài trang chủ.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 p-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <Field
              label="Tên danh mục"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              required
            />
            <div className="space-y-2">
              <div className="text-sm font-bold text-neutral-700">Ảnh danh mục <span className="text-red-600">*</span></div>
              {formData.iconUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  <img src={formData.iconUrl} alt={formData.name || "Danh mục"} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setFormData({ ...formData, iconUrl: "" })} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-red-600 shadow"><Trash2 className="h-4 w-4" /></button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm font-bold text-neutral-600 hover:border-brand-400">
                  {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-7 w-7" />}
                  <span className="mt-2">{isUploading ? "Đang tải ảnh..." : "Tải ảnh từ thiết bị"}</span>
                  <input type="file" accept="image/*" onChange={uploadImage} disabled={isUploading} className="sr-only" />
                </label>
              )}
              {uploadError && <p className="text-xs font-semibold text-red-600">{uploadError}</p>}
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3">
              <input
                type="checkbox"
                checked={formData.isVisible}
                onChange={(event) =>
                  setFormData({ ...formData, isVisible: event.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-neutral-700">
                Hiển thị danh mục ngoài cửa hàng
              </span>
            </label>

          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-neutral-700">Xem trước</p>
            <div className="w-[72px] overflow-hidden rounded-[10px] border border-[#f0d8c2] bg-[#fff7ed] shadow-sm">
              <span className="block min-h-[34px] px-2 pt-2 text-[12px] font-black leading-tight text-[#542413]">{formData.name || "Tên danh mục"}</span>
              <div className="relative mt-1 aspect-square w-full overflow-hidden bg-neutral-100">
                {formData.iconUrl ? (
                  <img
                    src={formData.iconUrl}
                    alt={formData.name || "Danh mục"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-neutral-400">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 md:col-span-2">
            {error && (
              <p className="mr-auto text-sm font-semibold text-red-600">{error}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCategory ? "Cập nhật" : "Thêm danh mục"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveProductsModal({
  category,
  targets,
  targetId,
  setTargetId,
  onClose,
  onConfirm,
  isSaving,
}: {
  category: Category;
  targets: Category[];
  targetId: string;
  setTargetId: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Danh mục còn sản phẩm
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              "{category.name}" đang có {category.productCount ?? 0} sản phẩm.
              Chọn danh mục nhận sản phẩm trước khi xóa.
            </p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-bold text-neutral-700">
            Chuyển sản phẩm sang
          </span>
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
          >
            <option value="">Chọn danh mục</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!targetId || isSaving}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Chuyển và xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-neutral-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}

function ImagePreview({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size: "lg" | "sm";
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-neutral-100 ${
        size === "lg" ? "h-14 w-14" : "h-10 w-10"
      }`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-neutral-400">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
