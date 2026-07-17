"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/types";

// Hooks
import {
  useOrders,
  useOrderFilters,
  useOrderStats,
  useOrderSelection,
  useOrderPagination,
} from "./_hooks/useOrders";

// Components
import { OrderStats } from "./_components/OrderStats";
import { OrderFilters } from "./_components/OrderFilters";
import { BulkActions } from "./_components/BulkActions";
import { OrderTable } from "./_components/OrderTable";
import { OrderDetailModal } from "./_components/OrderDetailModal";
import { OrderPagination } from "./_components/OrderPagination";

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
  const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Custom hooks
  const {
    orders,
    setOrders,
    isLoading,
    isRefreshing,
    error,
    setError,
    loadOrders,
    hasMore,
    isLoadingMore,
    loadMoreOrders,
  } = useOrders();
  const filteredOrders = useOrderFilters(
    orders,
    activeTab,
    statusFilter,
    dateFilter,
    query,
  );
  const stats = useOrderStats(orders);
  const pagination = useOrderPagination(filteredOrders);
  const {
    selectedIds,
    allFilteredSelected,
    toggleSelectAll,
    toggleSelectOrder,
    clearSelection,
  } = useOrderSelection(pagination.paginatedOrders);
  const selectedOrders = pagination.paginatedOrders.filter((order) =>
    selectedIds.includes(order.id),
  );

  async function updateOrder(order: Order, payload: Partial<Order>) {
    setSavingOrderIds((current) => new Set(current).add(order.id));
    setError(null);
    try {
      const updatedOrder = await updateOrderApi(order.id, payload);

      setOrders((current) =>
        current.map((item) => (item.id === order.id ? updatedOrder : item)),
      );
      setSelectedOrder((current) =>
        current?.id === order.id ? updatedOrder : current,
      );
      toast.success(
        updatedOrder.financialSyncPending
          ? "Đơn đã cập nhật; dữ liệu tài chính đang chờ đồng bộ lại."
          : "Đã cập nhật đơn hàng.",
      );
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật đơn hàng.",
      );
    } finally {
      setSavingOrderIds((current) => {
        const next = new Set(current);
        next.delete(order.id);
        return next;
      });
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
    setIsBulkSaving(true);
    setError(null);

    try {
      const { total, financialSyncPending } =
        await bulkUpdateOrderStatusApi(selectedIds, status);

      await loadOrders();
      clearSelection();
      toast.success(
        financialSyncPending
          ? `Đã cập nhật ${total} đơn; ${financialSyncPending} đơn đang chờ đồng bộ tài chính.`
          : `Đã cập nhật an toàn ${total} đơn.`,
      );
    } catch (err) {
      console.error("Failed to bulk update orders:", err);
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật hàng loạt.",
      );
    } finally {
      setIsBulkSaving(false);
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

    setSavingOrderIds((current) => new Set(current).add(order.id));
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
      toast.success(`Đã hoàn tiền đơn ${order.orderNumber}.`);
    } catch (refundError) {
      toast.error(
        refundError instanceof Error ? refundError.message : "Không thể hoàn tiền.",
      );
    } finally {
      setSavingOrderIds((current) => {
        const next = new Set(current);
        next.delete(order.id);
        return next;
      });
    }
  }

  async function reconcileFinancials(order: Order) {
    setSavingOrderIds((current) => new Set(current).add(order.id));
    try {
      const response = await fetch(
        `/api/admin/orders/${order.id}/reconcile-financials`,
        { method: "POST" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể đồng bộ tài chính.");
      await loadOrders();
      setSelectedOrder((current) =>
        current?.id === order.id
          ? { ...current, financialSyncPending: false, financialSyncError: "" }
          : current,
      );
      toast.success("Đã đồng bộ dữ liệu tài chính.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đồng bộ tài chính.",
      );
    } finally {
      setSavingOrderIds((current) => {
        const next = new Set(current);
        next.delete(order.id);
        return next;
      });
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
          type="button"
          onClick={() => void loadOrders()}
          disabled={isLoading || isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading || isRefreshing ? "animate-spin" : ""}`}
          />
          {isLoading ? "Đang tải…" : isRefreshing ? "Đang làm mới…" : "Làm mới"}
        </button>
      </div>

      {/* Alert messages */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
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
        selectedOrders={selectedOrders}
        onBulkUpdate={bulkUpdateStatus}
        onClearSelection={clearSelection}
        isSaving={isBulkSaving}
      />

      {/* Orders table */}
      <OrderTable
        orders={pagination.paginatedOrders}
        isLoading={isLoading}
        selectedIds={selectedIds}
        allSelected={allFilteredSelected}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelectOrder}
        onViewDetails={openDetails}
        onUpdateStatus={updateStatus}
        savingOrderIds={savingOrderIds}
      />

      <OrderPagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={filteredOrders.length}
        onPageChange={pagination.setPage}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMoreOrders}
      />

      {/* Order detail modal */}
      {selectedOrder && isModalOpen && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={closeModal}
          onUpdate={updateOrder}
          onPrint={printOrder}
          onRefund={refundOrder}
          onReconcileFinancials={reconcileFinancials}
          isSaving={savingOrderIds.has(selectedOrder.id)}
        />
      )}
    </div>
  );
}
