"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  buildProductCartItem,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

export function useProductBuyNow() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  return useCallback(
    (product: Product, customization: ProductCustomization) => {
      addItem(buildProductCartItem(product, customization));
      router.push("/checkout");
    },
    [addItem, router],
  );
}
