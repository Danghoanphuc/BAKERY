"use client";

import { JourneyView } from "./JourneyView";
import { MemberHeader } from "./MemberHeader";
import { OffersView } from "./OffersView";
import { RewardsTabs } from "./RewardsTabs";
import type { MyRewardsData, RewardsTab } from "./types";

export function RewardsScreen({
  data,
  activeTab,
  unlockedVoucherCount,
  onTabChange,
}: {
  data: MyRewardsData;
  activeTab: RewardsTab;
  unlockedVoucherCount: number;
  onTabChange: (tab: RewardsTab) => void;
}) {
  return (
    <main className="min-h-screen bg-[#fff7ea] text-[#5f2f1d]">
      <div className="mx-auto min-h-screen w-full max-w-[440px] bg-[#fff8ec] px-4 pb-24 pt-5 shadow-[0_0_42px_rgba(95,47,29,0.06)]">
        <MemberHeader data={data} onShowOffers={() => onTabChange("offers")} />
        <RewardsTabs activeTab={activeTab} onTabChange={onTabChange} />
        {activeTab === "journey" ? (
          <JourneyView
            data={data}
            unlockedVoucherCount={unlockedVoucherCount}
          />
        ) : (
          <OffersView vouchers={data.vouchers} />
        )}
      </div>
    </main>
  );
}
