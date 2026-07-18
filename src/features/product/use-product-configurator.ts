"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getProductSelectionMaxQuantity,
  getProductStartingPrice,
  getProductTotal,
  validateProductCustomization,
  type ProductCustomization,
  type ProductCustomizationErrors,
} from "@/features/product/product-cart";
import { trackProductEvent } from "@/features/product/product-analytics";
import { useProductDraftStore } from "@/features/product/product-draft-store";
import type { Product } from "@/types";

const DRAFT_KEY_PREFIX = "bakery-product-draft:";

export type ProductConfigurator = ReturnType<typeof useProductConfigurator>;

export function useProductConfigurator(
  product: Product,
  source: "sheet" | "page",
) {
  const [customization, setCustomization] = useState<ProductCustomization>(() =>
    useProductDraftStore.getState().drafts[product.id] ?? createDefaultCustomization(product),
  );
  const [errors, setErrors] = useState<ProductCustomizationErrors>({});
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const flavorSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored =
      useProductDraftStore.getState().drafts[product.id] ??
      readProductDraft(product.id);
    const next = stored ?? createDefaultCustomization(product);
    setCustomization(sanitizeCustomization(product, next));
    setErrors({});
    setIsPersonalizationOpen(Boolean(next.customMessage || next.candles));
  }, [product]);

  useEffect(() => {
    useProductDraftStore.getState().setDraft(product.id, customization);
    writeProductDraft(product.id, customization);
  }, [customization, product.id]);

  const totalPrice = getProductTotal(product, customization);
  const startingPrice = getProductStartingPrice(product);
  const maxQuantity = getProductSelectionMaxQuantity(
    product,
    customization.selectedSize,
    customization.selectedFlavor,
  );
  const missingSelection = !customization.selectedSize && product.sizeOptions?.length
    ? "size"
    : !customization.selectedFlavor && product.flavorOptions?.length
      ? "flavor"
      : undefined;
  const validation = useMemo(
    () => validateProductCustomization(product, customization),
    [customization, product],
  );
  const canPurchase = !Object.values(validation).some(Boolean);

  const patchCustomization = useCallback(
    (patch: Partial<ProductCustomization>) => {
      setCustomization((current) => {
        const next = { ...current, ...patch };
        useProductDraftStore.getState().setDraft(product.id, next);
        writeProductDraft(product.id, next);
        return next;
      });
      setErrors((current) => ({
        ...current,
        ...(patch.selectedSize ? { selectedSize: undefined } : {}),
        ...(patch.selectedFlavor ? { selectedFlavor: undefined } : {}),
        ...(patch.quantity ? { quantity: undefined } : {}),
      }));
    },
    [product.id],
  );

  const selectSize = useCallback(
    (selectedSize: string) => {
      patchCustomization({ selectedSize });
      trackProductEvent("variant_selected", {
        productId: product.id,
        source,
        sizeId: selectedSize,
        flavorId: customization.selectedFlavor,
      });
    },
    [customization.selectedFlavor, patchCustomization, product.id, source],
  );

  const selectFlavor = useCallback(
    (selectedFlavor: string) => {
      patchCustomization({ selectedFlavor });
      trackProductEvent("variant_selected", {
        productId: product.id,
        source,
        sizeId: customization.selectedSize,
        flavorId: selectedFlavor,
      });
    },
    [customization.selectedSize, patchCustomization, product.id, source],
  );

  const validateAndFocus = useCallback(() => {
    const nextErrors = validateProductCustomization(product, customization);
    setErrors(nextErrors);
    const reason = Object.values(nextErrors).find(Boolean);
    if (reason) {
      trackProductEvent("variant_validation_error", {
        productId: product.id,
        source,
        reason,
      });
      if (nextErrors.selectedSize) sizeSectionRef.current?.scrollIntoView({ block: "center" });
      else if (nextErrors.selectedFlavor) flavorSectionRef.current?.scrollIntoView({ block: "center" });
      return false;
    }
    return true;
  }, [customization, product, source]);

  return {
    customization,
    errors,
    isPersonalizationOpen,
    setIsPersonalizationOpen,
    sizeSectionRef,
    flavorSectionRef,
    totalPrice,
    startingPrice,
    maxQuantity,
    missingSelection,
    canPurchase,
    patchCustomization,
    selectSize,
    selectFlavor,
    validateAndFocus,
  };
}

function createDefaultCustomization(product: Product): ProductCustomization {
  return {
    quantity: 1,
    selectedFlavor: product.flavorOptions?.[0]?.id,
    customMessage: "",
    candles: 0,
  };
}

function sanitizeCustomization(
  product: Product,
  customization: ProductCustomization,
): ProductCustomization {
  return {
    quantity: Math.max(1, Math.min(99, customization.quantity || 1)),
    selectedSize: product.sizeOptions?.some((option) => option.id === customization.selectedSize)
      ? customization.selectedSize
      : undefined,
    selectedFlavor: product.flavorOptions?.some((option) => option.id === customization.selectedFlavor)
      ? customization.selectedFlavor
      : product.flavorOptions?.[0]?.id,
    customMessage: customization.customMessage?.slice(0, 100) ?? "",
    candles: Math.max(0, Math.min(99, customization.candles ?? 0)),
  };
}

function readProductDraft(productId: string) {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${productId}`);
    return value ? (JSON.parse(value) as ProductCustomization) : undefined;
  } catch {
    return undefined;
  }
}

function writeProductDraft(productId: string, customization: ProductCustomization) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${DRAFT_KEY_PREFIX}${productId}`,
      JSON.stringify(customization),
    );
  } catch {
    // The purchasing flow still works when session storage is unavailable.
  }
}
