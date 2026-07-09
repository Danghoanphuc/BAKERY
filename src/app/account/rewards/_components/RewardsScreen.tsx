"use client";

import { JourneyView } from "./JourneyView";
import { MemberHeader } from "./MemberHeader";
import type { MyRewardsData } from "./types";

export function RewardsScreen({
  data,
  unlockedVoucherCount,
}: {
  data: MyRewardsData;
  unlockedVoucherCount: number;
}) {
  return (
    <main className="min-h-screen bg-[#fff7ea] text-[#5f2f1d]">
      <div className="mx-auto min-h-screen w-full max-w-[440px] bg-[#fff8ec] px-4 pb-24 pt-5 shadow-[0_0_42px_rgba(95,47,29,0.06)]">
        <MemberHeader data={data} />
        <JourneyView data={data} unlockedVoucherCount={unlockedVoucherCount} />
      </div>
    </main>
  );
}
