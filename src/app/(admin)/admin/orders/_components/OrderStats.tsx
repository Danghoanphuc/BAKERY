import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { formatPrice } from "../_lib/order-utils";

type StatsProps = {
  pending: number;
  active: number;
  overdue: number;
  ready: number;
  cancelledToday: number;
  revenueToday: number;
};

export function OrderStats(props: StatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <StatCard icon={<Clock3 />} label="Chờ xử lý" value={props.pending} />
      <StatCard
        icon={<PackageCheck />}
        label="Đang vận hành"
        value={props.active}
      />
      <StatCard
        icon={<AlertTriangle />}
        label="Quá hạn"
        value={props.overdue}
        tone="danger"
      />
      <StatCard
        icon={<Truck />}
        label="Sẵn sàng giao/lấy"
        value={props.ready}
      />
      <StatCard
        icon={<XCircle />}
        label="Hủy hôm nay"
        value={props.cancelledToday}
        tone="warn"
      />
      <StatCard
        icon={<CheckCircle2 />}
        label="Doanh thu hôm nay"
        value={formatPrice(props.revenueToday)}
        wide
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "warn";
  wide?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-white text-[#b84a39] ring-[#f0e1d2]";

  return (
    <div className="rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] p-4 shadow-[0_14px_34px_rgba(61,36,23,0.06)]">
      <div className={`flex items-center gap-3 ${!wide ? "mb-3" : ""}`}>
        <div className={`rounded-2xl p-2.5 ring-1 ${toneClass}`}>
          {icon}
        </div>
        {wide && (
          <div className="flex-1">
            <p className="text-sm font-bold text-[#7b6254]">{label}</p>
            <p className="text-xl font-black text-[#3d2417]">{value}</p>
          </div>
        )}
      </div>
      {!wide && (
        <>
          <p className="text-sm font-bold text-[#7b6254]">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#3d2417]">{value}</p>
        </>
      )}
    </div>
  );
}
