"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { DebtOverviewCards, DebtTable } from "@/features/admin/wholesale/debt";

export default function DebtPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [overdueDealers, setOverdueDealers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setIsLoading(true);
      const [statsResponse, overdueResponse] = await Promise.all([
        fetch("/api/admin/wholesale/debt/overview", { cache: "no-store" }),
        fetch("/api/admin/wholesale/debt/overdue", { cache: "no-store" }),
      ]);

      if (!statsResponse.ok || !overdueResponse.ok) {
        throw new Error("Không thể tải dữ liệu công nợ");
      }

      setStats(await statsResponse.json());
      setOverdueDealers(await overdueResponse.json());
      setError(null);
    } catch (loadError) {
      console.error("Failed to load debt data:", loadError);
      setError("Không thể tải dữ liệu công nợ.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
            Wholesale CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">Quản lý công nợ</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7b6254]">
            Tổng quan công nợ, danh sách quá hạn và cảnh báo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {stats && <DebtOverviewCards stats={stats} />}

      <div>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-[#3d2417]">Danh sách cảnh báo & quá hạn</h2>
        </div>
        <DebtTable
          dealers={overdueDealers}
          isLoading={isLoading}
          onOpenDealer={(id) => router.push(`/wholesale/dealers/${id}`)}
        />
      </div>
    </div>
  );
}
