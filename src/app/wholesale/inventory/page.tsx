"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FolderTree,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/types";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import { InventoryItemTypeDialog } from "@/features/inventory/components/InventoryItemTypeDialog";
import { DeleteInventoryItemDialog } from "@/features/inventory/components/DeleteInventoryItemDialog";
import { IngredientGroupManagerDialog } from "@/features/inventory/components/IngredientGroupSelector";
import {
  getProductStockQty,
  isProductListed,
} from "@/lib/product-availability";
import { InventoryStats } from "./_components/InventoryStats";
import { InventoryTable } from "./_components/InventoryTable";
import {
  filterProducts,
  getInventoryStats,
  resolveInventoryCategoryName,
} from "./_lib/inventory-utils";
import { ProductFilter } from "./_lib/product-form";

type CostingSummaryResponse = {
  byProductId: Record<string, ProductCostSummary>;
  coverage: {
    total: number;
    recipe: number;
    legacy: number;
    missing: number;
  };
};

export function buildInventoryCsv(
  products: Product[],
  categories: Category[],
) {
  const separator = ";";
  const escapeCsvCell = (value: string | number) =>
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : `"${String(value).replace(/"/g, '""')}"`;
  const rows = products.map((product) => [
    product.name,
    product.sku ?? "",
    resolveInventoryCategoryName(product, categories),
    getProductStockQty(product),
    product.price || 0,
    isProductListed(product) ? "Đang bán" : "Tạm ẩn",
  ]);

  return [
    `sep=${separator}`,
    ["Tên sản phẩm", "SKU", "Danh mục", "Tồn kho", "Giá bán (VND)", "Trạng thái"]
      .map(escapeCsvCell)
      .join(separator),
    ...rows.map((row) => row.map(escapeCsvCell).join(separator)),
  ].join("\r\n");
}

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [costingByProductId, setCostingByProductId] = useState<
    Record<string, ProductCostSummary>
  >({});
  const [costingCoverage, setCostingCoverage] = useState({
    total: 0,
    recipe: 0,
    legacy: 0,
    missing: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] =
    useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIngredientGroupManagerOpen, setIsIngredientGroupManagerOpen] =
    useState(false);
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingCardTemplate, setIsSyncingCardTemplate] = useState(false);
  const utilityMenuRef = useRef<HTMLDivElement>(null);
  const utilityButtonRef = useRef<HTMLButtonElement>(null);
  const costingRequestIdRef = useRef(0);

  useEffect(() => {
    void loadInventory();
  }, []);

  useEffect(() => {
    if (!isUtilityMenuOpen) return;

    utilityMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus();

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!utilityMenuRef.current?.contains(event.target as Node)) {
        setIsUtilityMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isUtilityMenuOpen]);

  async function loadInventory({ showLoading = true }: { showLoading?: boolean } = {}) {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const costingRequestId = ++costingRequestIdRef.current;
      const costingRequest = fetch(
        "/api/wholesale/finance/costing-summary",
        { cache: "no-store" },
      );
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/wholesale/products", { cache: "no-store" }),
        fetch("/api/wholesale/categories", { cache: "no-store" }),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error("Cannot load inventory data");
      }

      setProducts((await productsRes.json()) as Product[]);
      setCategories((await categoriesRes.json()) as Category[]);

      void costingRequest
        .then(async (costingRes) => {
          if (costingRequestId !== costingRequestIdRef.current) return;
          if (!costingRes.ok) throw new Error("COSTING_SUMMARY_UNAVAILABLE");
          const costing = (await costingRes.json()) as CostingSummaryResponse;
          if (costingRequestId !== costingRequestIdRef.current) return;
          setCostingByProductId(costing.byProductId ?? {});
          setCostingCoverage(
            costing.coverage ?? { total: 0, recipe: 0, legacy: 0, missing: 0 },
          );
        })
        .catch(() => {
          if (costingRequestId !== costingRequestIdRef.current) return;
          setCostingByProductId({});
          setCostingCoverage({ total: 0, recipe: 0, legacy: 0, missing: 0 });
        });
      setError(null);
      return true;
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
      return false;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  const stats = useMemo(() => getInventoryStats(products), [products]);
  const filteredProducts = useMemo(
    () => filterProducts(products, categories, searchTerm, filter),
    [categories, filter, products, searchTerm],
  );

  const deleteProduct = async (product: Product) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/wholesale/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadInventory();
      setPendingDeleteProduct(null);
      toast.success(`Đã xóa sản phẩm “${product.name}”.`);
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error("Không thể xóa sản phẩm này.");
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshInventory = async () => {
    setIsRefreshing(true);
    const didRefresh = await loadInventory({ showLoading: false });
    setIsRefreshing(false);
    if (didRefresh) {
      setIsUtilityMenuOpen(false);
      toast.success("Đã làm mới dữ liệu kho.");
    } else {
      toast.error("Không thể làm mới dữ liệu kho. Hãy thử lại.");
    }
  };

  const exportFilteredProducts = () => {
    const csv = buildInventoryCsv(filteredProducts, categories);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = `sweettime-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
    setIsUtilityMenuOpen(false);
  };

  const toggleProductAvailability = async (product: Product) => {
    if ((product.itemType ?? "finished_good") !== "finished_good") return;
    const nextIsAvailable = !(product.isAvailable !== false);
    setSavingProductId(product.id);
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? { ...currentProduct, isAvailable: nextIsAvailable }
          : currentProduct,
      ),
    );

    try {
      const response = await fetch(`/api/wholesale/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextIsAvailable }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const savedProduct = (await response.json()) as Product;
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === savedProduct.id ? savedProduct : currentProduct,
        ),
      );
      toast.success(nextIsAvailable ? "Đã bật trạng thái bán." : "Đã tạm ngừng bán sản phẩm.");
    } catch (err) {
      console.error("Failed to update product availability:", err);
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id ? product : currentProduct,
        ),
      );
      toast.error("Không thể cập nhật trạng thái bán.");
    } finally {
      setSavingProductId(null);
    }
  };

  const syncCardTemplate = async () => {
    setIsSyncingCardTemplate(true);
    try {
      const response = await fetch("/api/wholesale/inventory/workspace-card-template", { method: "POST" });
      if (!response.ok) throw new Error(await response.text());
      await loadInventory({ showLoading: false });
      toast.success("Đã đồng bộ minh hoạ thẻ sản phẩm.");
      setIsUtilityMenuOpen(false);
    } catch (syncError) {
      console.error("Failed to sync workspace card template:", syncError);
      toast.error("Không thể đồng bộ ảnh minh hoạ thẻ. Hãy kiểm tra sản phẩm mẫu đã có đủ 5 ảnh.");
    } finally {
      setIsSyncingCardTemplate(false);
    }
  };

  const handleUtilityMenuKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setIsUtilityMenuOpen(false);
      utilityButtonRef.current?.focus();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (currentIndex + 1 + items.length) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            Quản lý kho & sản phẩm
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Một danh mục chung cho nguyên liệu, bán thành phẩm và thành phẩm.
            Chỉ thành phẩm mới có kênh bán và quyền xuất bản.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          <button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-sm font-semibold text-[var(--color-accent-ink)] shadow-sm transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo mã kho
          </button>
          <div ref={utilityMenuRef} className="relative">
            <button
              ref={utilityButtonRef}
              type="button"
              aria-label="Mở tiện ích kho"
              aria-controls="wholesale-inventory-utility-menu"
              aria-expanded={isUtilityMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsUtilityMenuOpen((isOpen) => !isOpen)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Phân loại & tiện ích
            </button>
            {isUtilityMenuOpen && (
              <div
                id="wholesale-inventory-utility-menu"
                role="menu"
                aria-label="Tiện ích kho"
                onKeyDown={handleUtilityMenuKeyDown}
                className="absolute right-0 z-[var(--z-dropdown)] mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1.5 shadow-[var(--shadow-float)]"
              >
                <UtilityButton
                  icon={isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  label={isRefreshing ? "Đang làm mới…" : "Làm mới dữ liệu"}
                  description="Tải lại sản phẩm, danh mục và giá vốn."
                  disabled={isRefreshing}
                  onClick={() => void refreshInventory()}
                />
                <UtilityButton
                  icon={<Download />}
                  label="Xuất danh sách CSV"
                  description={`Xuất ${filteredProducts.length} mặt hàng đang hiển thị.`}
                  onClick={exportFilteredProducts}
                />
                <Link
                  href="/wholesale/categories"
                  role="menuitem"
                  onClick={() => setIsUtilityMenuOpen(false)}
                  className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <Tags className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block font-bold">Danh mục bán hàng</span>
                    <span className="text-xs text-neutral-500">Quản lý nhóm thành phẩm bán ra.</span>
                  </span>
                </Link>
                <UtilityButton
                  icon={<FolderTree />}
                  label="Nhóm nguyên liệu"
                  description="Thêm, sửa nhóm chính và nhóm con."
                  onClick={() => {
                    setIsUtilityMenuOpen(false);
                    setIsIngredientGroupManagerOpen(true);
                  }}
                />
                <div className="my-1 border-t border-neutral-200" role="separator" />
                <UtilityButton
                  icon={isSyncingCardTemplate ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                  label={isSyncingCardTemplate ? "Đang đồng bộ…" : "Đồng bộ ảnh"}
                  description="Áp dụng bộ ảnh mẫu cho các thẻ workspace."
                  disabled={isSyncingCardTemplate}
                  onClick={() => void syncCardTemplate()}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <InventoryStats
        totalProducts={products.length}
        sellingProducts={stats.selling}
        lowStockProducts={stats.lowStock}
        inventoryValue={stats.inventoryValue}
        bomCoverage={costingCoverage}
      />

      <InventoryTable
        products={filteredProducts}
        categories={categories}
        costingByProductId={costingByProductId}
        isLoading={isLoading}
        searchTerm={searchTerm}
        filter={filter}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilter}
        onEdit={(product) => router.push(`/wholesale/inventory/${product.id}`)}
        onDelete={setPendingDeleteProduct}
        onToggleAvailability={toggleProductAvailability}
        savingProductId={savingProductId}
      />
      <InventoryItemTypeDialog
        isOpen={isCreateDialogOpen}
        basePath="/wholesale/inventory"
        onClose={() => setIsCreateDialogOpen(false)}
      />
      <IngredientGroupManagerDialog
        isOpen={isIngredientGroupManagerOpen}
        apiPath="/api/wholesale/inventory/ingredient-groups"
        onClose={() => setIsIngredientGroupManagerOpen(false)}
      />
      <DeleteInventoryItemDialog
        product={pendingDeleteProduct}
        isDeleting={isDeleting}
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => {
          if (pendingDeleteProduct) void deleteProduct(pendingDeleteProduct);
        }}
      />
    </div>
  );
}

function UtilityButton({
  icon,
  label,
  description,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0"
    >
      {icon}
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-neutral-500">
          {description}
        </span>
      </span>
    </button>
  );
}
