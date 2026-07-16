"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import type { Order } from "@/types";
import { formatCurrency, formatDateTime } from "../_lib/pos-utils";

type PosOrderStatus = Order["status"];

const STATUS_LABELS: Record<PosOrderStatus, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<PosOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-emerald-100 text-emerald-800",
  processing: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "QR/CK",
  card: "Thẻ",
  wallet: "Ví",
  other: "Khác",
};

export default function PosOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PosOrderStatus | "all">(
    "all",
  );

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/orders");
      if (!response.ok) throw new Error("Không thể tải đơn hàng.");
      const data = (await response.json()) as Order[];
      const posOrders = data.filter(
        (order) => order.salesChannel === "pos",
      );
      setOrders(posOrders);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load POS orders:", loadError);
      setError("Không thể tải đơn hàng POS.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders
      .filter(
        (order) =>
          statusFilter === "all" || order.status === statusFilter,
      )
        .filter((order) => {
        if (!keyword) return true;
        return [
          order.orderNumber,
          order.customerName,
          order.customerPhone,
          order.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    return {
      total: orders.length,
      todayCount: todayOrders.length,
      todayRevenue: todayOrders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + order.totalAmount, 0),
      completedCount: orders.filter(
        (order) => order.status === "completed",
      ).length,
    };
  }, [orders]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/pos"
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#eadbcc] bg-white text-[#7b6254] transition hover:border-[#b84a39]/50 hover:text-[#b84a39]"
          aria-label="Quay lại POS"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-[#3d2417]">
            Đơn hàng POS
          </h1>
          <p className="mt-0.5 text-sm font-semibold text-[#9b8171]">
            Quản lý đơn hàng bán tại quầy
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={isLoading}
          className="flex h-10 items-center gap-2 rounded-xl border border-[#eadbcc] bg-white px-4 text-sm font-bold text-[#7b6254] transition hover:border-[#b84a39]/50 hover:text-[#b84a39] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Tải lại
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tổng đơn" value={String(stats.total)} />
        <StatCard label="Đơn hôm nay" value={String(stats.todayCount)} />
        <StatCard
          label="Doanh thu hôm nay"
          value={formatCurrency(stats.todayRevenue)}
        />
        <StatCard label="Đã hoàn thành" value={String(stats.completedCount)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo mã đơn, tên, SĐT, ghi chú..."
            className="h-10 w-full rounded-xl border border-[#eadbcc] bg-white pl-9 pr-9 text-sm font-semibold text-[#3d2417] outline-none transition placeholder:text-[#b49a8a] focus:border-[#b84a39] focus:ring-4 focus:ring-[#b84a39]/10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#9b8171] transition hover:bg-[#fff1f0] hover:text-[#b84a39]"
              aria-label="Xoá tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatusPill
            active={statusFilter === "all"}
            label="Tất cả"
            count={orders.length}
            onClick={() => setStatusFilter("all")}
          />
          {(
            [
              "pending",
              "completed",
              "cancelled",
            ] as const
          ).map((status) => (
            <StatusPill
              key={status}
              active={statusFilter === status}
              label={STATUS_LABELS[status]}
              count={orders.filter((o) => o.status === status).length}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-xl bg-[#f4ebe1]"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[#eadbcc] bg-white text-sm font-semibold text-[#9b8171]">
          {searchTerm || statusFilter !== "all"
            ? "Không có đơn hàng phù hợp."
            : "Chưa có đơn hàng POS nào."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-4 rounded-xl border border-[#eadbcc] bg-white p-4 transition hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#3d2417]">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${STATUS_COLORS[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  {order.paymentMethod && (
                    <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[11px] font-bold text-[#b84a39]">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ??
                        order.paymentMethod}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[#9b8171]">
                  <span>{order.customerName || "Khách lẻ"}</span>
                  {order.customerPhone &&
                    order.customerPhone !== "0000000000" && (
                      <span>{order.customerPhone}</span>
                    )}
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                {order.notes && (
                  <p className="mt-1 truncate text-xs font-semibold text-[#7b6254]">
                    Ghi chú: {order.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-[#b84a39]">
                  {formatCurrency(order.totalAmount)}
                </p>
                {(order.discountAmount ?? 0) > 0 && (
                  <p className="text-xs font-semibold text-[#9b8171]">
                    Giảm: {formatCurrency(order.discountAmount ?? 0)}
                  </p>
                )}
                <p className="text-xs font-semibold text-[#9b8171]">
                  {order.items.length} món
                </p>
              </div>
              <button
                type="button"
                onClick={() => printOrderReceipt(order)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#eadbcc] bg-white text-[#7b6254] transition hover:border-[#b84a39]/50 hover:text-[#b84a39]"
                aria-label="In hoá đơn"
                title="In hoá đơn"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function printOrderReceipt(order: Order) {
  const lines = [
    "BAKERY POS",
    `Đơn: ${order.orderNumber}`,
    order.customerName ? `Khách: ${order.customerName}` : "Khách: Khách lẻ",
    order.customerPhone && order.customerPhone !== "0000000000"
      ? `SĐT: ${order.customerPhone}`
      : "",
    "------------------------------",
    ...order.items.map(
      (item) =>
        `${item.productName} x${item.quantity} - ${formatCurrency(item.price * item.quantity)}`,
    ),
    "------------------------------",
    `Tạm tính: ${formatCurrency(order.productSubtotal ?? order.totalAmount)}`,
    `Giảm giá: -${formatCurrency(order.discountAmount ?? 0)}`,
    `Tổng tiền: ${formatCurrency(order.totalAmount)}`,
    order.paymentMethod
      ? `Thanh toán: ${PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}`
      : "",
    order.notes ? `Ghi chú: ${order.notes}` : "",
  ].filter(Boolean);

  const receipt = lines.join("\n");
  const printWindow = window.open("", "_blank", "width=420,height=680");
  if (!printWindow) return;

  printWindow.document.write(
    `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${receipt}</pre>`,
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eadbcc] bg-white p-4">
      <p className="text-xs font-bold text-[#9b8171]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#3d2417]">{value}</p>
    </div>
  );
}

function StatusPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${
        active
          ? "bg-[#b84a39] text-white"
          : "border border-[#eadbcc] bg-white text-[#65483a] hover:border-[#b84a39]/50"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/20" : "bg-[#fff1f0] text-[#b84a39]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
