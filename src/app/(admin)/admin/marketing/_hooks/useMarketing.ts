import { useState, useEffect, useMemo } from "react";
import type { MarketingCampaign, MarketingSettings } from "@/types";

export type MarketingData = {
  campaigns: MarketingCampaign[];
  settings: MarketingSettings;
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    voucherCampaigns: number;
    totalBudget: number;
    totalUsed: number;
  };
};

export function useMarketing() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMarketing() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/marketing");
      if (!response.ok) throw new Error("load_failed");
      const payload = await response.json();
      setData(payload);
      setError(null);
    } catch (err) {
      console.error("Failed to load marketing:", err);
      setError("Không thể tải dữ liệu marketing.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMarketing();
  }, []);

  return {
    data,
    isLoading,
    error,
    setError,
    loadMarketing,
  };
}

export function useFilteredCampaigns(
  campaigns: MarketingCampaign[],
  activeTab: "campaigns" | "vouchers" | "settings",
) {
  return useMemo(() => {
    if (activeTab === "vouchers") {
      return campaigns.filter((campaign) => campaign.type === "voucher");
    }
    return campaigns;
  }, [activeTab, campaigns]);
}
