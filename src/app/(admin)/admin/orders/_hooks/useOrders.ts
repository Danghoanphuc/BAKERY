import { useState, useEffect, useMemo } from "react";
import type { Order } from "@/types";
import { activeStatuses } from "../_lib/constants";
import {
  isToday,
  isOverdueOrder,
  matchesDateFilter,
} from "../_lib/order-utils";
import type { TabFilter, StatusFilter, DateFilter } from "../_lib/constants";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Không thể tải đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return {
    orders,
    setOrders,
    isLoading,
    error,
    setError,
    loadOrders,
  };
}

export function useOrderFilters(
  orders: Order[],
  activeTab: TabFilter,
  statusFilter: StatusFilter,
  dateFilter: DateFilter,
  query: string,
) {
  return useMemo(() => {
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
}

export function useOrderStats(orders: Order[]) {
  return useMemo(() => {
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
}

export function useOrderSelection(filteredOrders: Order[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  function clearSelection() {
    setSelectedIds([]);
  }

  return {
    selectedIds,
    setSelectedIds,
    allFilteredSelected,
    toggleSelectAll,
    toggleSelectOrder,
    clearSelection,
  };
}
