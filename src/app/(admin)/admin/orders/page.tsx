"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Order, OrderStatus } from "@/types";

// Hooks
import {
  useOrders,
  useOrderFilters,
  useOrderStats,
  useOrderSelection,
} from "./_hooks/useOrders";

// Components
import { OrderStats } from "./_components/OrderStats";
import { OrderFilters } from "./_components/OrderFilters";
import { BulkActions } from "./_components/BulkActions";
import { OrderTable } from "./_components/OrderTable";
import { OrderDetailModal } from "./_components/OrderDetailModal";

// API
import { updateOrderApi, bulkUpdateOrderStatusApi } from "./_api/orderApi";

// Utils
import { buildPrintableOrder } from "./_lib/print-utils";

// Types
import type { TabFilter, StatusFilter, DateFilter } from "./_lib/constants";

export default function OrdersPage() {
  // Filter states
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading & message states
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Custom hooks
  const { orders, setOrders, isLoading, error, setError, loadOrders } =
    useOrders();
  const filteredOrders = useOrderFilters(
    orders,
    activeTab,
    statusFilter,
    dateFilter,
    query,
  );
  const stats = useOrderStats(orders);
  const {
    selectedIds,
    allFilteredSelected,
    toggleSelectAll,
    toggleSelectOrder,
    clearSelection,
  } = useOrderSelection(filteredOrders);

  async function updateOrder(order: Order, payload: Partial<Order>) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updatedOrder = await updateOrderApi(order.id, payload);

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
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { failed, total } = await bulkUpdateOrderStatusApi(
        selectedIds,
        orders,
        status,
      );

      await loadOrders();
      setMessage(
        failed
          ? `Đã xử lý một phần, ${failed} đơn không hợp lệ.`
          : `Đã cập nhật ${total} đơn.`,
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

  async function refundOrder(order: Order) {
    const reason = window.prompt("Lý do hoàn tiền:")?.trim();
    if (!reason) return;
    const settlementConfirmed =
      order.paymentMethod !== "bank_transfer" ||
      window.confirm("Xác nhận bạn đã hoàn tiền chuyển khoản cho khách?");
    if (!settlementConfirmed) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pos/checkout/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, settlementConfirmed }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể hoàn tiền.");
      await loadOrders();
      closeModal();
      setMessage(`Đã hoàn tiền đơn ${order.orderNumber}.`);
    } catch (refundError) {
      setError(
        refundError instanceof Error ? refundError.message : "Không thể hoàn tiền.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Alert messages */}
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

      {/* Stats */}
      <OrderStats {...stats} />

      {/* Filters */}
      <OrderFilters
        query={query}
        setQuery={setQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        filteredCount={filteredOrders.length}
      />

      {/* Bulk actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onBulkUpdate={bulkUpdateStatus}
        onClearSelection={clearSelection}
        isSaving={isSaving}
      />

      {/* Orders table */}
      <OrderTable
        orders={filteredOrders}
        isLoading={isLoading}
        selectedIds={selectedIds}
        allSelected={allFilteredSelected}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelectOrder}
        onViewDetails={openDetails}
        onUpdateStatus={updateStatus}
        isSaving={isSaving}
      />

      {/* Order detail modal */}
      {selectedOrder && isModalOpen && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={closeModal}
          onUpdate={updateOrder}
          onPrint={printOrder}
          onRefund={refundOrder}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
