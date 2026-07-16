import { MoreVertical, Phone, MapPin } from "lucide-react";

interface Dealer {
  id: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  type: string;
  status: string;
  tier: string;
  currentDebt: number;
  creditLimit: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

interface DealerTableProps {
  dealers: Dealer[];
  isLoading: boolean;
  onOpenDealer: (id: string) => void;
}

export function DealerTable({ dealers, isLoading, onOpenDealer }: DealerTableProps) {
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Hoạt động",
      rejected: "Từ chối",
      suspended: "Đình chỉ",
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
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

  const getTypeLabel = (type: string) => {
    const labels = {
      retail: "Cửa hàng lẻ",
      restaurant: "Nhà hàng",
      cafe: "Quán cafe",
      other: "Khác",
    };
    return labels[type as keyof typeof labels] || type;
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
        <p className="text-sm font-semibold text-[#7b6254]">Đang tải danh sách đại lý...</p>
      </div>
    );
  }

  if (dealers.length === 0) {
    return (
      <div className="rounded-2xl border border-[#f0e1d2] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#7b6254]">Chưa có đại lý nào</p>
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
              Loại hình
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Trạng thái
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tier
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Công nợ
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Tổng chi tiêu
            </th>
            <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-[#7b6254]">
              Đơn hàng
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
              className="cursor-pointer transition hover:bg-[#fffaf6]"
              onClick={() => onOpenDealer(dealer.id)}
            >
              <td className="px-5 py-4">
                <div>
                  <p className="font-semibold text-[#3d2417]">{dealer.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#7b6254]">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {dealer.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {dealer.district}, {dealer.city}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-[#7b6254]">
                {getTypeLabel(dealer.type)}
              </td>
              <td className="px-5 py-4">{getStatusBadge(dealer.status)}</td>
              <td className="px-5 py-4">{getTierBadge(dealer.tier)}</td>
              <td className="px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#3d2417]">
                    {formatCurrency(dealer.currentDebt)}
                  </p>
                  <p className="text-xs text-[#9b8171]">
                    Hạn mức: {formatCurrency(dealer.creditLimit)}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 text-sm font-semibold text-[#3d2417]">
                {formatCurrency(dealer.totalSpent)}
              </td>
              <td className="px-5 py-4 text-sm text-[#7b6254]">{dealer.totalOrders}</td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDealer(dealer.id);
                  }}
                  className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2] hover:text-[#b84a39]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
