"use client";

import type { ReactNode } from "react";
import { Gift, Trophy } from "lucide-react";

import type { RewardsTab } from "./types";

export function RewardsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: RewardsTab;
  onTabChange: (tab: RewardsTab) => void;
}) {
  return (
    <div className="mt-5 rounded-full border border-[#f3d29c] bg-white p-1 shadow-[0_8px_18px_rgba(122,53,31,0.10)]">
      <div className="grid grid-cols-2 gap-1">
        <TabButton
          active={activeTab === "journey"}
          onClick={() => onTabChange("journey")}
        >
          <Trophy className="h-4 w-4" />
          Hành trình
        </TabButton>
        <TabButton
          active={activeTab === "offers"}
          onClick={() => onTabChange("offers")}
        >
          <Gift className="h-4 w-4" />
          Ưu đãi
        </TabButton>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-black transition ${
        active ? "bg-[#6b351f] text-white shadow-sm" : "text-[#9a623a]"
      }`}
    >
      {children}
    </button>
  );
}
