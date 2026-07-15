"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import {
  buildHomeRecommendations,
  type PurchaseHistoryOrder,
} from "./home-recommendations";

interface UseHomeRecommendationsOptions {
  products: Product[];
  favoriteIds: string[];
  isAuthenticated: boolean;
  deliveryMode?: "delivery" | "pickup";
}

export function useHomeRecommendations({
  products,
  favoriteIds,
  isAuthenticated,
  deliveryMode = "delivery",
}: UseHomeRecommendationsOptions) {
  const [orders, setOrders] = useState<PurchaseHistoryOrder[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([]);
      return;
    }

    const controller = new AbortController();
    fetch("/api/orders", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOrders([]);
      });

    return () => controller.abort();
  }, [isAuthenticated]);

  return useMemo(
    () => buildHomeRecommendations({ products, orders, favoriteIds, deliveryMode }),
    [deliveryMode, favoriteIds, orders, products],
  );
}
