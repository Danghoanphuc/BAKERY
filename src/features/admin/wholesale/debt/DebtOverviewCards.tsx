import { DollarSign, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface DebtOverviewStats {
  totalDebt: number;
  totalCreditLimit: number;
  debtRatio: number;
  overdueCount: number;
  warningCount: number;
  currentCount: number;
  blockedCount: number;
  totalDealers: number;
}

interface DebtOverviewCardsProps {
  stats: DebtOverviewStats;
}

export function DebtOverviewCards({ stats }: DebtOverviewCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      id: "totalDebt",
      label: "Tổng công nợ",
      value: formatCurrency(stats.totalDebt),
      detail: `Hạn mức: ${formatCurrency(stats.totalCreditLimit)}`,
      icon: DollarSign,
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "debtRatio",
      label: "Tỷ lệ nợ",
      value: `${stats.debtRatio.toFixed(1)}%`,
      detail: `${stats.totalDealers} đại lý`,
      icon: AlertTriangle,
      color: stats.debtRatio >= 80 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600",
    },
    {
      id: "current",
      label: "Bình thường",
      value: stats.currentCount.toString(),
      detail: "< 80% hạn mức",
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      id: "warning",
      label: "Cảnh báo",
      value: stats.warningCount.toString(),
      detail: "80-99% hạn mức",
      icon: AlertTriangle,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      id: "blocked",
      label: "Quá hạn",
      value: stats.blockedCount.toString(),
      detail: "≥ 100% hạn mức",
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <p className="mt-1 text-2xl font-black text-[#3d2417]">{card.value}</p>
            <p className="mt-2 text-xs text-[#9b8171]">{card.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
