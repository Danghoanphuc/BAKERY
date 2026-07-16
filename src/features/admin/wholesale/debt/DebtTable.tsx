import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface OverdueDealer {
  id: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  currentDebt: number;
  creditLimit: number;
  debtRatio: number;
  status: "warning" | "blocked";
  tier: string;
  paymentTerms: string;
}

interface DebtTableProps {
  dealers: OverdueDealer[];
  isLoading: boolean;
  onOpenDealer: (id: string) => void;
}

export function DebtTable({ dealers, isLoading, onOpenDealer }: DebtTableProps) {
  const getStatusBadge = (status: string) => {
    const styles = {
      warning: "bg-yellow-100 text-yellow-800",
      blocked: "bg-red-100 text-red-800",
    };
    const labels = {
      warning: "Cảnh báo",
      blocked: "Quá hạn",
    };
    const icons = {
      warning: AlertTriangle,
      blocked: XCircle,
    };
    const Icon = icons[status as keyof typeof icons];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const styles = {
      regular: "bg-gray-100 text-gray-800",
      silver: "bg-slate-100 text-slate-800",
      gold: "bg-amber-100 text-amber-800",
      platinum: "bg-purple-100 text-purple-800",
    };
    const labels = {
      regular: "Thường",
      silver: "Bạc",
      gold: "Vàng",
      platinum: "Bạch kim",
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[tier as keyof typeof styles]}`}>
        {labels[tier as keyof typeof labels] || tier}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#7b6254]">Đang tải danh sách công nợ...</p>
      </div>
    );
  }

  if (dealers.length === 0) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#7b6254]">Không có đại lý quá hạn</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0e1d2] bg-white">
      <table className="w-full">
        <thead className="bg-[#fffaf6]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Đại lý
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tier
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Điều kiện thanh toán
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Nợ hiện tại
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Hạn mức
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tỷ lệ nợ
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Trạng thái
            </th>
            <th className="px-5 py-3 text-right text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e1d2]">
          {dealers.map((dealer) => (
            <tr
              key={dealer.id}
              className={`cursor-pointer transition hover:bg-[#fffaf6] ${
                dealer.status === "blocked" ? "bg-red-50" : ""
              }`}
              onClick={() => onOpenDealer(dealer.id)}
            >
              <td className="px-5 py-4">
                <div>
                  <p className="font-semibold text-[#3d2417]">{dealer.name}</p>
                  <p className="mt-1 text-xs text-[#7b6254]">
                    {dealer.phone} • {dealer.district}, {dealer.city}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4">{getTierBadge(dealer.tier)}</td>
              <td className="px-5 py-4 text-sm text-[#7b6254]">
                {dealer.paymentTerms === "cod" ? "COD" : dealer.paymentTerms === "net_7" ? "NET 7" : "Đơn tiếp theo"}
              </td>
              <td className="px-5 py-4">
                <p className="text-sm font-semibold text-[#3d2417]">
                  {formatCurrency(dealer.currentDebt)}
                </p>
              </td>
              <td className="px-5 py-4 text-sm text-[#7b6254]">
                {formatCurrency(dealer.creditLimit)}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${
                        dealer.debtRatio >= 100 ? "bg-red-500" : "bg-yellow-500"
                      }`}
                      style={{ width: `${Math.min(dealer.debtRatio, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#3d2417]">
                    {dealer.debtRatio.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td className="px-5 py-4">{getStatusBadge(dealer.status)}</td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDealer(dealer.id);
                  }}
                  className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2] hover:text-[#b84a39]"
                >
                  <Clock className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
