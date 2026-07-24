import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Cake, ShieldCheck, UserRound, WalletCards } from "lucide-react";

import { formatCurrency, type CustomerStats } from "./customer-crm-utils";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "brand" | "green" | "red" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-600"
          : "bg-brand-50 text-brand-600";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

export function CustomerStatsCards({ stats }: { stats: CustomerStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <StatCard icon={UserRound} label="Tổng khách" value={stats.total.toString()} />
      <StatCard
        icon={ShieldCheck}
        label="Đã xác minh"
        value={stats.verified.toString()}
        tone="green"
      />
      <StatCard
        icon={AlertTriangle}
        label="Cần gọi"
        value={stats.red.toString()}
        tone="red"
      />
      <StatCard
        icon={WalletCards}
        label="Điểm đang có"
        value={stats.points.toLocaleString("vi-VN")}
        tone="amber"
      />
      <StatCard
        icon={Cake}
        label="Doanh thu khách"
        value={formatCurrency(stats.revenue)}
      />
    </div>
  );
}
