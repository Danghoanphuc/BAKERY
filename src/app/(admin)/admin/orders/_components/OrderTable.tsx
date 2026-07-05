import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import {
  formatPrice,
  formatDateTime,
  isOverdueOrder,
} from "../_lib/order-utils";
import { orderTypeLabel, paymentLabels } from "../_lib/constants";
import { getQuickActions } from "../_lib/order-utils";

type OrderTableProps = {
  orders: Order[];
  isLoading: boolean;
  selectedIds: string[];
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (orderId: string) => void;
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => void;
  isSaving: boolean;
};

export function OrderTable(props: OrderTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={props.allSelected}
                  onChange={props.onToggleSelectAll}
                  className="h-4 w-4"
                />
              </th>
              <HeaderCell>Mã đơn</HeaderCell>
              <HeaderCell>Khách hàng</HeaderCell>
              <HeaderCell>Tổng tiền</HeaderCell>
              <HeaderCell>Loại</HeaderCell>
              <HeaderCell>Trạng thái</HeaderCell>
              <HeaderCell>Thanh toán</HeaderCell>
              <HeaderCell>Thời gian</HeaderCell>
              <HeaderCell>Thao tác nhanh</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {props.isLoading && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-sm text-neutral-500"
                >
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Đang tải đơn hàng...
                </td>
              </tr>
            )}

            {!props.isLoading &&
              props.orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isSelected={props.selectedIds.includes(order.id)}
                  onToggleSelect={() => props.onToggleSelect(order.id)}
                  onViewDetails={() => props.onViewDetails(order)}
                  onUpdateStatus={(status) =>
                    props.onUpdateStatus(order, status)
                  }
                  isSaving={props.isSaving}
                />
              ))}

            {!props.isLoading && props.orders.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-sm text-neutral-500"
                >
                  Không có đơn hàng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
      {children}
    </th>
  );
}

function OrderRow({
  order,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onUpdateStatus,
  isSaving,
}: {
  order: Order;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  isSaving: boolean;
}) {
  const isOverdue = isOverdueOrder(order);
  const quickActions = getQuickActions(order);

  return (
    <tr
      className={`transition-colors hover:bg-neutral-50 ${
        isOverdue ? "bg-red-50/45" : ""
      }`}
    >
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4"
        />
      </td>
      <td className="px-4 py-4">
        <button
          onClick={onViewDetails}
          className="text-left text-sm font-bold text-neutral-900 hover:text-brand-600"
        >
          {order.orderNumber}
        </button>
        {isOverdue && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Quá hạn
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium text-neutral-900">
          {order.customerName}
        </div>
        <div className="text-sm text-neutral-500">{order.customerPhone}</div>
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-neutral-900">
        {formatPrice(order.totalAmount)}
      </td>
      <td className="px-4 py-4 text-sm text-neutral-700">
        {orderTypeLabel[order.orderType]}
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-4">
        <PaymentBadge status={order.paymentStatus ?? "unpaid"} />
      </td>
      <td className="px-4 py-4 text-sm text-neutral-500">
        <div>{formatDateTime(order.createdAt)}</div>
        {order.pickupTime && (
          <div className="mt-1 text-xs font-semibold text-amber-700">
            Hẹn: {formatDateTime(order.pickupTime)}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.status}
              onClick={() => onUpdateStatus(action.status)}
              disabled={isSaving}
              className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={onViewDetails}
            className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Xem
          </button>
        </div>
      </td>
    </tr>
  );
}

function PaymentBadge({ status }: { status: Order["paymentStatus"] }) {
  const label = paymentLabels[status || "unpaid"];
  const className =
    status === "paid"
      ? "bg-green-100 text-green-700"
      : status === "refunded"
        ? "bg-amber-100 text-amber-700"
        : "bg-neutral-100 text-neutral-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
