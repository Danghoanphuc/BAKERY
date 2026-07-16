"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { RouteTable } from "@/features/admin/wholesale/routes";
import type { DeliveryRoute } from "@/types";

export default function DeliveryRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRoutes() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/wholesale/routes", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách tuyến đường");
      }

      setRoutes((await response.json()) as DeliveryRoute[]);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load delivery routes:", loadError);
      setError("Không thể tải dữ liệu tuyến đường.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/wholesale/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Không thể cập nhật trạng thái");
      }

      loadRoutes();
    } catch (error) {
      console.error("Failed to toggle active status:", error);
      setError("Không thể cập nhật trạng thái.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa tuyến đường này?")) return;

    try {
      const response = await fetch(`/api/admin/wholesale/routes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xóa tuyến đường");
      }

      loadRoutes();
    } catch (error) {
      console.error("Failed to delete route:", error);
      setError("Không thể xóa tuyến đường.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
            Wholesale CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">Đi tuyến</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7b6254]">
            Quản lý tuyến giao hàng và lịch giao hàng định kỳ cho đại lý
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadRoutes}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => router.push("/wholesale/routes/new")}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#b84a39] px-4 text-sm font-semibold text-white hover:bg-[#c94c5c]"
          >
            <Plus className="h-4 w-4" />
            Thêm tuyến
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <RouteTable
        routes={routes}
        isLoading={isLoading}
        onEditRoute={(id) => router.push(`/wholesale/routes/${id}`)}
        onDeleteRoute={handleDelete}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
