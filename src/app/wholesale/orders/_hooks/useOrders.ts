import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Order } from "@/types";
import { isRevenueRecognized } from "@/features/wholesale-finance/domain/revenue-policy";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasLoaded = useRef(false);

  const loadOrders = useCallback(async () => {
    try {
      if (hasLoaded.current) setIsRefreshing(true);
      else setIsLoading(true);
      const res = await fetch("/api/wholesale/orders?limit=100");
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as {
        orders: Order[];
        nextCursor: string | null;
      };
      setOrders(data.orders);
      setNextCursor(data.nextCursor);
      setError(null);
      hasLoaded.current = true;
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Không thể tải đơn hàng.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadMoreOrders = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/wholesale/orders?limit=100&cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) throw new Error("load_more_failed");
      const data = (await res.json()) as {
        orders: Order[];
        nextCursor: string | null;
      };
      setOrders((current) => {
        const knownIds = new Set(current.map((order) => order.id));
        return [
          ...current,
          ...data.orders.filter((order) => !knownIds.has(order.id)),
        ];
      });
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Failed to load more orders:", err);
      setError("Không thể tải thêm đơn hàng cũ.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    setOrders,
    isLoading,
    isRefreshing,
    error,
    setError,
    loadOrders,
    hasMore: Boolean(nextCursor),
    isLoadingMore,
    loadMoreOrders,
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
    const keyword = normalizeSearchValue(query.trim());

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
          .some((value) => normalizeSearchValue(String(value)).includes(keyword));
      const matchesDate = matchesDateFilter(order, dateFilter);

      return matchesType && matchesStatus && matchesKeyword && matchesDate;
    });
  }, [activeTab, dateFilter, orders, query, statusFilter]);
}

export function useOrderStats(orders: Order[]) {
  return useMemo(() => calculateOrderStats(orders), [orders]);
}

export function calculateOrderStats(orders: Order[]) {
  const todayOrders = orders.filter((order) => isToday(order.createdAt));
  const revenueToday = todayOrders
    .filter(isRevenueRecognized)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return {
    pending: orders.filter((order) => order.status === "pending").length,
    active: orders.filter((order) => activeStatuses.has(order.status)).length,
    overdue: orders.filter(isOverdueOrder).length,
    ready: orders.filter((order) => order.status === "ready").length,
    cancelledToday: todayOrders.filter((order) => order.status === "cancelled")
      .length,
    revenueToday,
  };
}

export function useOrderSelection(filteredOrders: Order[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedIds.includes(order.id));

  useEffect(() => {
    const visibleIds = new Set(filteredOrders.map((order) => order.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [filteredOrders]);

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

export function useOrderPagination(orders: Order[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setPage(1);
  }, [orders]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page, pageSize]);

  return { page, pageCount, pageSize, paginatedOrders, setPage };
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
