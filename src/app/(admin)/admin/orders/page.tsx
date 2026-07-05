"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import type {
  Order,
  OrderStatus,
  OrderStatusHistoryItem,
  OrderType,
  PaymentStatus,
} from "@/types";

type TabFilter = "all" | OrderType;
type DateFilter = "all" | "today" | "upcoming" | "overdue";
type StatusFilter = "all" | OrderStatus;

const tabs: { id: TabFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "delivery", label: "Giao hàng" },
  { id: "pickup", label: "Đến lấy" },
  { id: "preorder", label: "Đặt trước" },
];

const statuses: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "ready", label: "Sẵn sàng" },
  { value: "processing", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
];

const orderTypeLabel: Record<OrderType, string> = {
  delivery: "Giao hàng",
  pickup: "Đến lấy",
  preorder: "Đặt trước",
};

const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

const statusFlow: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "processing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "completed", "cancelled"],
  processing: ["completed", "delivered", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};

const activeStatuses = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "processing",
]);

const terminalStatuses = new Set<OrderStatus>([
  "completed",
  "delivered",
  "cancelled",
]);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setOrders(data);
      setSelectedIds([]);
      setError(null);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Không thể tải đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesType = activeTab === "all" || order.orderType === activeTab;
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesKeyword =
        !keyword ||
        [
          order.orderNumber,
          order.customerName,
          order.customerPhone,
          order.customerEmail,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesDate = matchesDateFilter(order, dateFilter);

      return matchesType && matchesStatus && matchesKeyword && matchesDate;
    });
  }, [activeTab, dateFilter, orders, query, statusFilter]);

  const stats = useMemo(() => {
    const todayOrders = orders.filter((order) => isToday(order.createdAt));
    const revenueToday = todayOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      pending: orders.filter((order) => order.status === "pending").length,
      active: orders.filter((order) => activeStatuses.has(order.status)).length,
      overdue: orders.filter(isOverdueOrder).length,
      ready: orders.filter((order) => order.status === "ready").length,
      cancelledToday: todayOrders.filter(
        (order) => order.status === "cancelled",
      ).length,
      revenueToday,
    };
  }, [orders]);

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedIds.includes(order.id));

  function toggleSelectAll() {
    setSelectedIds(
      allFilteredSelected ? [] : filteredOrders.map((order) => order.id),
    );
  }

  function toggleSelectOrder(orderId: string) {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  async function updateOrder(order: Order, payload: Partial<Order>) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        throw new Error("Không thể chuyển trạng thái theo luồng này.");
      }
      if (!response.ok) throw new Error("Không thể cập nhật đơn hàng.");

      const updatedOrder = await response.json();
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? updatedOrder : item)),
      );
      setSelectedOrder((current) =>
        current?.id === order.id ? updatedOrder : current,
      );
      setMessage("Đã cập nhật đơn hàng.");
    } catch (err) {
      console.error("Failed to update order:", err);
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật đơn hàng.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(
    order: Order,
    status: OrderStatus,
    note?: string,
  ) {
    await updateOrder(order, { status, cancelReason: note });
  }

  async function bulkUpdateStatus(status: OrderStatus) {
    const targets = orders.filter((order) => selectedIds.includes(order.id));
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const results = await Promise.allSettled(
        targets.map((order) =>
          fetch(`/api/orders/${order.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }),
        ),
      );
      const failed = results.filter(
        (result) => result.status === "rejected" || !result.value.ok,
      ).length;

      await loadOrders();
      setMessage(
        failed
          ? `Đã xử lý một phần, ${failed} đơn không hợp lệ.`
          : `Đã cập nhật ${targets.length} đơn.`,
      );
    } catch (err) {
      console.error("Failed to bulk update orders:", err);
      setError("Không thể cập nhật hàng loạt.");
    } finally {
      setIsSaving(false);
    }
  }

  function openDetails(order: Order) {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }

  function printOrder(order: Order) {
    const printable = buildPrintableOrder(order);
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-neutral-600">
            Theo dõi vận hành, xử lý bếp, giao hàng và pickup trong một màn
            hình.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {(error || message) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<Clock3 />} label="Chờ xử lý" value={stats.pending} />
        <StatCard
          icon={<PackageCheck />}
          label="Đang vận hành"
          value={stats.active}
        />
        <StatCard
          icon={<AlertTriangle />}
          label="Quá hạn"
          value={stats.overdue}
          tone="danger"
        />
        <StatCard
          icon={<Truck />}
          label="Sẵn sàng giao/lấy"
          value={stats.ready}
        />
        <StatCard
          icon={<XCircle />}
          label="Hủy hôm nay"
          value={stats.cancelledToday}
          tone="warn"
        />
        <StatCard
          icon={<CheckCircle2 />}
          label="Doanh thu hôm nay"
          value={formatPrice(stats.revenueToday)}
          wide
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã đơn, tên khách, số điện thoại..."
              className="h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              ["all", "Tất cả trạng thái"],
              ...statuses.map(
                (status) => [status.value, status.label] as [string, string],
              ),
            ]}
          />
          <Select
            value={dateFilter}
            onChange={(value) => setDateFilter(value as DateFilter)}
            options={[
              ["all", "Mọi thời gian"],
              ["today", "Hôm nay"],
              ["upcoming", "Sắp tới"],
              ["overdue", "Quá hạn"],
            ]}
          />
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-600">
            <Filter className="h-4 w-4" />
            {filteredOrders.length} đơn
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex flex-wrap gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="text-sm font-semibold text-brand-700">
            Đã chọn {selectedIds.length} đơn
          </span>
          <div className="flex flex-wrap gap-2">
            <BulkButton
              label="Xác nhận"
              onClick={() => bulkUpdateStatus("confirmed")}
              disabled={isSaving}
            />
            <BulkButton
              label="Đang chuẩn bị"
              onClick={() => bulkUpdateStatus("preparing")}
              disabled={isSaving}
            />
            <BulkButton
              label="Hoàn thành"
              onClick={() => bulkUpdateStatus("completed")}
              disabled={isSaving}
            />
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-white"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
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
              {isLoading && (
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

              {!isLoading &&
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-colors hover:bg-neutral-50 ${
                      isOverdueOrder(order) ? "bg-red-50/45" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openDetails(order)}
                        className="text-left text-sm font-bold text-neutral-900 hover:text-brand-600"
                      >
                        {order.orderNumber}
                      </button>
                      {isOverdueOrder(order) && (
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
                      <div className="text-sm text-neutral-500">
                        {order.customerPhone}
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
                      <div className="flex flex-wrap gap-2">
                        {getQuickActions(order).map((action) => (
                          <button
                            key={action.status}
                            onClick={() => updateStatus(order, action.status)}
                            disabled={isSaving}
                            className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          onClick={() => openDetails(order)}
                          className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredOrders.length === 0 && (
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

      {selectedOrder && isModalOpen && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={closeModal}
          onUpdate={updateOrder}
          onPrint={printOrder}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdate,
  onPrint,
  isSaving,
}: {
  order: Order;
  onClose: () => void;
  onUpdate: (order: Order, payload: Partial<Order>) => Promise<void>;
  onPrint: (order: Order) => void;
  isSaving: boolean;
}) {
  const [internalNotes, setInternalNotes] = useState(order.internalNotes ?? "");
  const [assignedTo, setAssignedTo] = useState(order.assignedTo ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.paymentStatus ?? "unpaid",
  );
  const [cancelReason, setCancelReason] = useState(order.cancelReason ?? "");

  async function saveOperations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdate(order, {
      internalNotes,
      assignedTo,
      paymentStatus,
      cancelReason,
    });
  }

  async function changeStatus(status: OrderStatus) {
    await onUpdate(order, {
      status,
      cancelReason: status === "cancelled" ? cancelReason : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-5">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Đơn hàng {order.orderNumber}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {order.customerName} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(order)}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Printer className="h-4 w-4" />
              In phiếu
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-neutral-900">Luồng xử lý</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Chỉ hiển thị các bước tiếp theo hợp lệ.
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusFlow[order.status].map((status) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(status)}
                    disabled={isSaving}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                      status === "cancelled"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-neutral-900 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {labelForStatus(status)}
                  </button>
                ))}
                {terminalStatuses.has(order.status) && (
                  <span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-500">
                    Đơn đã kết thúc
                  </span>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Sản phẩm</h3>
              <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {order.items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex items-center gap-4 p-3"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900">
                        {item.productName}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {[
                          item.selectedSize && `Size: ${item.selectedSize}`,
                          item.selectedFlavor && `Vị: ${item.selectedFlavor}`,
                          item.customMessage &&
                            `Tin nhắn: ${item.customMessage}`,
                          item.candles ? `${item.candles} nến` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-neutral-900">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <div className="text-sm text-neutral-500">
                        x{item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Timeline</h3>
              <Timeline
                items={order.statusHistory ?? []}
                currentStatus={order.status}
              />
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">
                Thông tin khách
              </h3>
              <InfoLine label="Khách hàng" value={order.customerName} />
              <InfoLine label="Điện thoại" value={order.customerPhone} />
              {order.customerEmail && (
                <InfoLine label="Email" value={order.customerEmail} />
              )}
              <InfoLine
                label="Loại đơn"
                value={orderTypeLabel[order.orderType]}
              />
              {order.deliveryAddress && (
                <InfoLine label="Địa chỉ" value={order.deliveryAddress} />
              )}
              {order.pickupTime && (
                <InfoLine
                  label="Giờ hẹn"
                  value={formatDateTime(order.pickupTime)}
                />
              )}
              {order.notes && (
                <InfoLine label="Ghi chú khách" value={order.notes} />
              )}
            </section>

            <form
              onSubmit={saveOperations}
              className="space-y-3 rounded-lg border border-neutral-200 p-4"
            >
              <h3 className="font-bold text-neutral-900">Vận hành nội bộ</h3>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Nhân viên phụ trách
                </span>
                <input
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
                  placeholder="VD: Bếp A, shipper Minh"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Thanh toán
                </span>
                <select
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(event.target.value as PaymentStatus)
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
                >
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="refunded">Đã hoàn tiền</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Ghi chú nội bộ
                </span>
                <textarea
                  value={internalNotes}
                  onChange={(event) => setInternalNotes(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Lý do hủy nếu có
                </span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Lưu vận hành
              </button>
            </form>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Tổng kết</h3>
              <InfoLine
                label="Tạm tính"
                value={formatPrice(
                  order.totalAmount +
                    (order.discountAmount ?? 0) -
                    (order.deliveryFee ?? 0),
                )}
              />
              <InfoLine
                label="Phí giao hàng"
                value={formatPrice(order.deliveryFee ?? 0)}
              />
              <InfoLine
                label="Giảm giá"
                value={formatPrice(order.discountAmount ?? 0)}
              />
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <InfoLine
                  label="Tổng cộng"
                  value={formatPrice(order.totalAmount)}
                  strong
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "warn" | "danger";
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white p-4 shadow-sm ${wide ? "md:col-span-2 xl:col-span-1" : ""}`}
    >
      <div
        className={`mb-3 inline-flex rounded-lg p-2 ${
          tone === "danger"
            ? "bg-red-100 text-red-700"
            : tone === "warn"
              ? "bg-amber-100 text-amber-700"
              : "bg-brand-50 text-brand-600"
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
      {children}
    </th>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-brand-500"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function BulkButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        status === "paid"
          ? "border-green-200 bg-green-100 text-green-700"
          : status === "refunded"
            ? "border-neutral-200 bg-neutral-100 text-neutral-700"
            : "border-amber-200 bg-amber-100 text-amber-700"
      }`}
    >
      {paymentLabels[status]}
    </span>
  );
}

function Timeline({
  items,
  currentStatus,
}: {
  items: OrderStatusHistoryItem[];
  currentStatus: OrderStatus;
}) {
  const history = items.length
    ? items
    : [
        {
          status: currentStatus,
          at: new Date().toISOString(),
          actor: "system",
        },
      ];

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div key={`${item.status}-${item.at}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-brand-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {index < history.length - 1 && (
              <div className="mt-1 h-8 w-px bg-neutral-200" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">
              {labelForStatus(item.status)}
            </div>
            <div className="text-xs text-neutral-500">
              {formatDateTime(item.at)} · {item.actor ?? "system"}
            </div>
            {item.note && (
              <div className="mt-1 text-xs text-neutral-600">{item.note}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span
        className={`text-right ${
          strong
            ? "text-base font-bold text-neutral-900"
            : "font-medium text-neutral-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getQuickActions(order: Order) {
  return statusFlow[order.status].slice(0, 2).map((status) => ({
    status,
    label: labelForStatus(status),
  }));
}

function labelForStatus(status: OrderStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function matchesDateFilter(order: Order, filter: DateFilter) {
  if (filter === "all") return true;
  if (filter === "today") return isToday(order.createdAt);
  if (filter === "upcoming") {
    return Boolean(
      order.pickupTime &&
      new Date(order.pickupTime).getTime() >= Date.now() &&
      activeStatuses.has(order.status),
    );
  }
  return isOverdueOrder(order);
}

function isToday(date: Date | string) {
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
}

function isOverdueOrder(order: Order) {
  if (!activeStatuses.has(order.status)) return false;
  if (order.pickupTime) {
    return new Date(order.pickupTime).getTime() < Date.now();
  }

  const createdAt = new Date(order.createdAt).getTime();
  const maxAgeMinutes = order.orderType === "delivery" ? 75 : 45;
  return Date.now() - createdAt > maxAgeMinutes * 60 * 1000;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDateTime(date: Date | string | undefined) {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "N/A";

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(dateObj);
  } catch {
    return "N/A";
  }
}

function buildPrintableOrder(order: Order) {
  const items = order.items
    .map(
      (item) => `
        <tr>
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>${formatPrice(item.price * item.quantity)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <html>
      <head>
        <title>${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #171717; }
          h1 { margin: 0 0 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          td, th { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          .muted { color: #666; }
          .total { font-size: 20px; font-weight: 700; text-align: right; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>Phiếu đơn ${order.orderNumber}</h1>
        <div class="muted">${formatDateTime(order.createdAt)}</div>
        <p><strong>Khách:</strong> ${order.customerName} · ${order.customerPhone}</p>
        <p><strong>Loại đơn:</strong> ${orderTypeLabel[order.orderType]}</p>
        ${order.deliveryAddress ? `<p><strong>Địa chỉ:</strong> ${order.deliveryAddress}</p>` : ""}
        ${order.pickupTime ? `<p><strong>Giờ hẹn:</strong> ${formatDateTime(order.pickupTime)}</p>` : ""}
        ${order.notes ? `<p><strong>Ghi chú:</strong> ${order.notes}</p>` : ""}
        <table>
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
        <div class="total">Tổng: ${formatPrice(order.totalAmount)}</div>
      </body>
    </html>
  `;
}
