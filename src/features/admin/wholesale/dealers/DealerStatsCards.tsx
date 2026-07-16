import { Building2, Users, AlertTriangle, CheckCircle } from "lucide-react";

interface DealerStats {
  total: number;
  pending: number;
  approved: number;
  suspended: number;
}

interface DealerStatsCardsProps {
  stats: DealerStats;
}

export function DealerStatsCards({ stats }: DealerStatsCardsProps) {
  const cards = [
    {
      id: "total",
      label: "Tổng đại lý",
      value: stats.total.toString(),
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "pending",
      label: "Chờ phê duyệt",
      value: stats.pending.toString(),
      icon: AlertTriangle,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      id: "approved",
      label: "Đang hoạt động",
      value: stats.approved.toString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      id: "suspended",
      label: "Đình chỉ",
      value: stats.suspended.toString(),
      icon: Users,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#7b6254]">{card.label}</p>
            <p className="mt-1 text-3xl font-black text-[#3d2417]">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
