import { describe, expect, it } from "vitest";
import type { MarketingCampaign } from "@/types";
import { getVoucherMetrics } from "./voucher-admin";

function campaign(metrics: MarketingCampaign["metrics"]): MarketingCampaign {
  return {
    id: "voucher-1", name: "Test", type: "voucher", status: "active",
    title: "Test", description: "", audience: "Tất cả", channel: "Web",
    discountType: "percent", discountValue: 10, usedCount: metrics?.redeemedCount ?? 0,
    isFeatured: true, metrics,
  };
}

describe("getVoucherMetrics", () => {
  it("keeps the legacy invariant that issued count cannot be below redemptions", () => {
    const result = getVoucherMetrics(campaign({
      issuedCount: 0, redeemedCount: 3, discountSpent: 60_000, revenueGenerated: 540_000,
    }));

    expect(result.issuedCount).toBe(3);
    expect(result.redeemedCount).toBe(3);
    expect(result.usageRate).toBe(100);
  });

  it("uses actual issue counts for newly tracked campaigns", () => {
    const result = getVoucherMetrics(campaign({
      issuedCount: 10, availableCount: 6, redeemedCount: 4,
      discountSpent: 80_000, revenueGenerated: 720_000,
    }));

    expect(result.issuedCount).toBe(10);
    expect(result.usageRate).toBe(40);
  });
});
