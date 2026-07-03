import { clsx } from "clsx";
import type { OrderStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  preparing: {
    label: "Đang chuẩn bị",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  ready: {
    label: "Sẵn sàng",
    className: "bg-teal-100 text-teal-800 border-teal-200",
  },
  processing: {
    label: "Đang xử lý",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  delivered: {
    label: "Đã giao",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
