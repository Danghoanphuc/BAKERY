"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Product } from "@/types";
import { CategoryDrawer } from "./CategoryDrawer";

type CategoryMapProps = {
  categories: Category[];
  isSaving: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleVisibility: (category: Category) => void;
};

export function CategoryMap({
  categories,
  isSaving,
  onEdit,
  onDelete,
  onToggleVisibility,
}: CategoryMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId),
    [categories, selectedId],
  );
  const visibleCount = categories.filter(
    (category) => category.isVisible ?? true,
  ).length;
  const alertCount = categories.filter(needsAttention).length;

  useEffect(() => {
    if (!isDrawerOpen || hasLoadedProducts) return;

    let isCancelled = false;

    async function loadProducts() {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("products_load_failed");

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("products_payload_invalid");
        if (!isCancelled) {
          setProducts(data);
          setHasLoadedProducts(true);
        }
      } catch (error) {
        console.error("Failed to load category products:", error);
        if (!isCancelled) {
          setProductsError("Không thể tải sản phẩm của danh mục.");
        }
      } finally {
        if (!isCancelled) setIsLoadingProducts(false);
      }
    }

    void loadProducts();
    return () => {
      isCancelled = true;
    };
  }, [hasLoadedProducts, isDrawerOpen]);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Bản đồ vận hành</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Chọn một nhánh để xem tình trạng và xử lý nhanh danh mục.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <MapBadge>{categories.length} danh mục</MapBadge>
          <MapBadge tone="success">{visibleCount} đang hiển thị</MapBadge>
          {alertCount > 0 && <MapBadge tone="warning">{alertCount} cần chú ý</MapBadge>}
        </div>
      </div>

      <div className="relative mt-7 overflow-hidden rounded-xl bg-neutral-50 px-3 py-6 sm:px-6">
        <div className="absolute left-1/2 top-[5.8rem] h-9 w-px -translate-x-1/2 bg-neutral-300" />
        <div className="absolute left-[8%] right-[8%] top-[8rem] h-px bg-neutral-300" />

        <div className="relative mx-auto grid w-fit place-items-center rounded-xl border border-brand-200 bg-white px-5 py-3 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">Cửa hàng</span>
          <strong className="text-base text-neutral-900">Sweet Bakery</strong>
          <span className="text-xs text-neutral-500">Danh mục đang trưng bày</span>
        </div>

        <div className="relative mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryNode
              key={category.id}
              category={category}
              isSelected={isDrawerOpen && selectedCategory?.id === category.id}
              onSelect={() => {
                setSelectedId(category.id);
                setIsDrawerOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      {selectedCategory && (
        <CategoryDrawer
          key={selectedCategory.id}
          category={selectedCategory}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedId(null);
          }}
          isSaving={isSaving}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleVisibility={onToggleVisibility}
          products={products}
          isLoadingProducts={isLoadingProducts}
          productsError={productsError}
        />
      )}
    </section>
  );
}

function CategoryNode({
  category,
  isSelected,
  onSelect,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isVisible = category.isVisible ?? true;
  const attention = needsAttention(category);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`relative min-h-32 rounded-xl border bg-white p-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        isSelected
          ? "border-brand-500 ring-2 ring-brand-100"
          : attention
            ? "border-amber-300 hover:border-amber-400"
            : "border-neutral-200 hover:border-brand-300 hover:shadow-md"
      } ${!isVisible ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <CategoryImage category={category} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-neutral-900">{category.name}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {category.activeProductCount ?? 0} / {category.productCount ?? 0} đang bán
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <NodeBadge tone={isVisible ? "success" : "neutral"}>
          {isVisible ? "Đang hiển thị" : "Đang ẩn"}
        </NodeBadge>
        {(category.outOfStockProductCount ?? 0) > 0 && (
          <NodeBadge tone="warning">{category.outOfStockProductCount} hết hàng</NodeBadge>
        )}
        {(category.productCount ?? 0) === 0 && <NodeBadge tone="warning">Trống</NodeBadge>}
      </div>
    </button>
  );
}

function CategoryImage({
  category,
  size = "default",
}: {
  category: Category;
  size?: "default" | "large";
}) {
  const dimensions = size === "large" ? "h-14 w-14" : "h-11 w-11";

  return (
    <div className={`${dimensions} shrink-0 overflow-hidden rounded-lg bg-neutral-200`}>
      {category.iconUrl ? (
        <img src={category.iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-xs font-bold text-neutral-500">?</div>
      )}
    </div>
  );
}

function MapBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const styles = {
    neutral: "bg-neutral-100 text-neutral-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-800",
  };
  return <span className={`rounded-full px-2.5 py-1 ${styles[tone]}`}>{children}</span>;
}

function NodeBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "success" | "warning";
}) {
  const styles = {
    neutral: "bg-neutral-100 text-neutral-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}

function needsAttention(category: Category) {
  return (category.productCount ?? 0) === 0 || (category.outOfStockProductCount ?? 0) > 0;
}
