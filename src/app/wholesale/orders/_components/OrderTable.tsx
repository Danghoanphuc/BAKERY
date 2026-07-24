import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { StatusBadge } from "@/features/wholesale-admin/components/StatusBadge";
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
  savingOrderIds: Set<string>;
};

export function OrderTable(props: OrderTableProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {props.isLoading && (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Đang tải đơn hàng...
          </div>
        )}
        {!props.isLoading && props.orders.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
            Không có đơn hàng phù hợp.
          </div>
        )}
        {!props.isLoading &&
          props.orders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              isSelected={props.selectedIds.includes(order.id)}
              onToggleSelect={() => props.onToggleSelect(order.id)}
              onViewDetails={() => props.onViewDetails(order)}
              onUpdateStatus={(status) => props.onUpdateStatus(order, status)}
              isSaving={props.savingOrderIds.has(order.id)}
            />
          ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white md:block">
        <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={props.allSelected}
                  onChange={props.onToggleSelectAll}
                  aria-label="Chọn tất cả đơn trên trang"
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
                  isSaving={props.savingOrderIds.has(order.id)}
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
          aria-label={`Chọn đơn ${order.orderNumber}`}
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
          {order.customerName || "Khách lẻ"}
        </div>
        <div className="text-sm text-neutral-500">
          {order.customerPhone || "Chưa có số điện thoại"}
        </div>
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
        <OrderActions
          quickActions={quickActions}
          onUpdateStatus={onUpdateStatus}
          onViewDetails={onViewDetails}
          isSaving={isSaving}
        />
      </td>
    </tr>
  );
}

function MobileOrderCard({
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
  const quickActions = getQuickActions(order);
  const overdue = isOverdueOrder(order);

  return (
    <article className={`rounded-lg border bg-white p-4 ${overdue ? "border-red-200 bg-red-50/40" : "border-neutral-200"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Chọn đơn ${order.orderNumber}`}
          className="mt-1 h-4 w-4"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="font-bold text-neutral-900 hover:text-brand-600"
          >
            {order.orderNumber}
          </button>
          <p className="mt-1 truncate text-sm text-neutral-600">
            {order.customerName || "Khách lẻ"} · {order.customerPhone || "Chưa có SĐT"}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold text-neutral-900">
          {formatPrice(order.totalAmount)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus ?? "unpaid"} />
        <span className="text-xs text-neutral-500">{orderTypeLabel[order.orderType]}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
        <span className="text-xs text-neutral-500">{formatDateTime(order.createdAt)}</span>
        <OrderActions
          quickActions={quickActions}
          onUpdateStatus={onUpdateStatus}
          onViewDetails={onViewDetails}
          isSaving={isSaving}
        />
      </div>
    </article>
  );
}

function OrderActions({
  quickActions,
  onUpdateStatus,
  onViewDetails,
  isSaving,
}: {
  quickActions: ReturnType<typeof getQuickActions>;
  onUpdateStatus: (status: OrderStatus) => void;
  onViewDetails: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {quickActions.map((action) => (
        <button
          type="button"
          key={action.status}
          onClick={() => onUpdateStatus(action.status)}
          disabled={isSaving}
          className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
        >
          {action.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onViewDetails}
        className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
      >
        <Eye className="h-3.5 w-3.5" />
        Xem
      </button>
    </div>
  );
}

function PaymentBadge({ status }: { status: Order["paymentStatus"] }) {
  const label = paymentLabels[status || "unpaid"];
  const className =
    status === "paid"
      ? "bg-green-100 text-green-700"
      : status === "pending"
        ? "bg-blue-100 text-blue-700"
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
