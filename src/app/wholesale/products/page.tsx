"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { WholesaleProductTable } from "@/features/admin/wholesale/products";
import type { WholesaleProduct } from "@/types";

export default function WholesaleProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/wholesale/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách sản phẩm sỉ");
      }

      setProducts((await response.json()) as WholesaleProduct[]);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load wholesale products:", loadError);
      setError("Không thể tải dữ liệu sản phẩm sỉ.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleToggleAvailability(id: string, isAvailable: boolean) {
    try {
      const response = await fetch(`/api/admin/wholesale/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });

      if (!response.ok) {
        throw new Error("Không thể cập nhật trạng thái");
      }

      loadProducts();
    } catch (error) {
      console.error("Failed to toggle availability:", error);
      setError("Không thể cập nhật trạng thái.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm sỉ này?")) return;

    try {
      const response = await fetch(`/api/admin/wholesale/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xóa sản phẩm");
      }

      loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      setError("Không thể xóa sản phẩm.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
            Wholesale CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">Sản phẩm sỉ</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7b6254]">
            Quản lý giá sỉ, tồn kho và chiết khấu theo tier cho sản phẩm
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadProducts}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/inventory")}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#b84a39] px-4 text-sm font-semibold text-white hover:bg-[#c94c5c]"
          >
            <Plus className="h-4 w-4" />
            Thêm từ kho
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <WholesaleProductTable
        products={products}
        isLoading={isLoading}
        onEditProduct={(id) => router.push(`/wholesale/products/${id}`)}
        onDeleteProduct={handleDelete}
        onToggleAvailability={handleToggleAvailability}
      />
    </div>
  );
}
