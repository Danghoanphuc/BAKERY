"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import type { Category, Product } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import { InventoryStats } from "./_components/InventoryStats";
import { InventoryTable } from "./_components/InventoryTable";
import {
  filterProducts,
  getInventoryStats,
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
  const [isSyncingCardTemplate, setIsSyncingCardTemplate] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory({ showLoading = true }: { showLoading?: boolean } = {}) {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const [productsRes, categoriesRes, costingRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/admin/finance/costing-summary", { cache: "no-store" }),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error("Cannot load inventory data");
      }

      setProducts((await productsRes.json()) as Product[]);
      setCategories((await categoriesRes.json()) as Category[]);

      if (costingRes.ok) {
        const costing = (await costingRes.json()) as CostingSummaryResponse;
        setCostingByProductId(costing.byProductId ?? {});
        setCostingCoverage(
          costing.coverage ?? { total: 0, recipe: 0, legacy: 0, missing: 0 },
        );
      } else {
        setCostingByProductId({});
        setCostingCoverage({ total: 0, recipe: 0, legacy: 0, missing: 0 });
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
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
    if (!confirm(`Xóa sản phẩm "${product.name}"?`)) return;

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadInventory();
    } catch (err) {
      console.error("Failed to delete product:", err);
      setError("Không thể xóa sản phẩm này.");
    }
  };

  const toggleProductAvailability = async (product: Product) => {
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
      const response = await fetch(`/api/products/${product.id}`, {
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
    } catch (err) {
      console.error("Failed to update product availability:", err);
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id ? product : currentProduct,
        ),
      );
      setError("Không thể cập nhật trạng thái bán.");
    } finally {
      setSavingProductId(null);
    }
  };

  const syncCardTemplate = async () => {
    setIsSyncingCardTemplate(true);
    try {
      const response = await fetch("/api/admin/inventory/workspace-card-template", { method: "POST" });
      if (!response.ok) throw new Error(await response.text());
      await loadInventory({ showLoading: false });
    } catch (syncError) {
      console.error("Failed to sync workspace card template:", syncError);
      setError("Không thể đồng bộ ảnh minh hoạ thẻ. Hãy kiểm tra sản phẩm mẫu đã có đủ 5 ảnh.");
    } finally {
      setIsSyncingCardTemplate(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            Quản lý kho & sản phẩm
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Theo dõi tồn kho, giá bán, kênh giao/lấy tại quán và dữ liệu phục vụ
            search/filter. Giá vốn ưu tiên theo BOM (Finance).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={syncCardTemplate} disabled={isSyncingCardTemplate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50">{isSyncingCardTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Đồng bộ minh hoạ thẻ</button><Link href="/admin/inventory/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"><Plus className="h-4 w-4" /> Thêm sản phẩm</Link></div>
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
        onEdit={(product) => router.push(`/admin/inventory/${product.id}`)}
        onDelete={deleteProduct}
        onToggleAvailability={toggleProductAvailability}
        savingProductId={savingProductId}
      />
    </div>
  );
}
