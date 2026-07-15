"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { RewardsScreen } from "./_components/RewardsScreen";
import type { MyRewardsData } from "./_components/types";

export default function MyRewardsPage() {
  const [data, setData] = useState<MyRewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRewards() {
      try {
        const response = await fetch("/api/rewards");

        if (response.status === 401) {
          window.location.href = "/account/login?next=/account/rewards";
          return;
        }

        if (!response.ok) {
          throw new Error("load_failed");
        }

        setData(await response.json());
      } catch (err) {
        console.error("Failed to load rewards:", err);
        setError("Không thể tải trang tích điểm.");
      } finally {
        setIsLoading(false);
      }
    }

    loadRewards();
  }, []);

  const unlockedVoucherCount = useMemo(() => {
    return data?.vouchers.filter((voucher) => voucher.unlocked).length ?? 0;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#fff7ea] px-4 text-[#7a351f]">
        <div className="flex items-center gap-2 text-sm font-black">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang mở hành trình hảo ngọt...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#fff7ea] px-4">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm">
          {error || "Không tìm thấy dữ liệu tích điểm."}
        </div>
      </div>
    );
  }

  return (
    <RewardsScreen data={data} unlockedVoucherCount={unlockedVoucherCount} />
  );
}
