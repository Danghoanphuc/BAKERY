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
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-3 ${!wide ? "mb-3" : ""}`}>
        <div
          className={`rounded-lg p-2 ${
            tone === "danger"
              ? "bg-red-50 text-red-600"
              : tone === "warn"
                ? "bg-amber-50 text-amber-600"
                : "bg-brand-50 text-brand-600"
          }`}
        >
          {icon}
        </div>
        {wide && (
          <div className="flex-1">
            <p className="text-sm text-neutral-600">{label}</p>
            <p className="text-xl font-bold text-neutral-900">{value}</p>
          </div>
        )}
      </div>
      {!wide && (
        <>
          <p className="text-sm text-neutral-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
        </>
      )}
    </div>
  );
}
