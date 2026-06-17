import { clsx } from "clsx";
import type { OrderStatus } from "@/lib/mock-admin-data";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  processing: {
    label: "Đang làm",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  completed: {
    label: "Đã giao",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
