"use client";

import { useState } from "react";
import { Clock3, Gift, LayoutDashboard, Ticket } from "lucide-react";

import { JourneyView } from "./JourneyView";
import { MemberHeader } from "./MemberHeader";
import { OffersView } from "./OffersView";
import { PointHistory } from "./PointHistory";
import { RewardCatalog } from "./RewardCatalog";
import type { MyRewardsData } from "./types";

type View = "overview" | "rewards" | "vouchers" | "history";

const navigation = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "rewards", label: "Đổi thưởng", icon: Gift },
  { id: "vouchers", label: "Voucher", icon: Ticket },
  { id: "history", label: "Lịch sử", icon: Clock3 },
] satisfies Array<{ id: View; label: string; icon: typeof Gift }>;

export function RewardsScreen({ data }: { data: MyRewardsData; unlockedVoucherCount: number }) {
  const [view, setView] = useState<View>("overview");

  return (
    <div className="brand-page w-full overflow-x-clip">
      <div className="mx-auto w-full max-w-5xl px-3 pb-6 pt-3 sm:px-5 lg:py-6">
        <MemberHeader data={data} onNavigate={setView} />

        <nav className="mt-4 flex min-w-0 gap-5 overflow-x-auto border-b border-sand px-1">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`relative flex h-10 shrink-0 items-center justify-center gap-1.5 text-xs font-bold transition ${view === id ? "text-brand-500 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500" : "text-text-muted hover:text-brand-500"}`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-4">
          {view === "overview" && <JourneyView data={data} />}
          {view === "rewards" && <RewardCatalog rewards={data.rewardCatalog} currentPoints={data.points.current} />}
          {view === "vouchers" && <OffersView data={data} />}
          {view === "history" && <PointHistory entries={data.pointHistory} />}
        </div>
      </div>
    </div>
  );
}
