import { useCallback, useRef, useState } from "react";
import type { Product, SizeOption, FlavorOption } from "@/types";
import { parsePosVoucherToken } from "@/lib/pos-voucher-token";
import { isProductSellableToday } from "../_lib/pos-utils";

type ScannerAction =
  | { type: "product"; product: Product; selectedSize?: string; selectedFlavor?: string }
  | { type: "voucher"; code: string; tokenData?: ReturnType<typeof parsePosVoucherToken> }
  | { type: "customer"; phone: string }
  | { type: "unknown"; raw: string };

const SCANNER_TIMEOUT_MS = 100;
const PHONE_REGEX = /^(0[0-9]{9})$/;

function findProductByBarcode(products: Product[], raw: string): { product: Product; size?: SizeOption; flavor?: FlavorOption } | null {
  const normalized = raw.trim().toLowerCase();
  for (const product of products) {
    if (!isProductSellableToday(product)) continue;

    // Check product-level barcode/SKU first
    if (product.barcode && product.barcode.toLowerCase() === normalized) {
      return { product };
    }
    if (product.sku && product.sku.toLowerCase() === normalized) {
      return { product };
    }

    // Check size options
    for (const size of product.sizeOptions ?? []) {
      if (size.barcode && size.barcode.toLowerCase() === normalized) {
        return { product, size };
      }
      if (size.sku && size.sku.toLowerCase() === normalized) {
        return { product, size };
      }
    }

    // Check flavor options
    for (const flavor of product.flavorOptions ?? []) {
      if (flavor.barcode && flavor.barcode.toLowerCase() === normalized) {
        return { product, flavor };
      }
      if (flavor.sku && flavor.sku.toLowerCase() === normalized) {
        return { product, flavor };
      }
    }
  }
  return null;
}

export function usePosScanner({
  products,
  onAddProduct,
  onScanVoucher,
  onScanCustomer,
}: {
  products: Product[];
  onAddProduct: (product: Product, options?: { selectedSize?: string; selectedFlavor?: string }) => void;
  onScanVoucher: (code: string, tokenData?: ReturnType<typeof parsePosVoucherToken>) => void;
  onScanCustomer: (phone: string) => void;
}) {
  const [lastAction, setLastAction] = useState<ScannerAction | null>(null);
  const bufferRef = useRef("");
  const timeoutRef = useRef<number | null>(null);

  const classifyInput = useCallback(
    (raw: string): ScannerAction => {
      const trimmed = raw.trim();
      if (!trimmed) return { type: "unknown", raw: trimmed };

      const voucherToken = parsePosVoucherToken(trimmed);
      if (voucherToken) {
        return { type: "voucher", code: voucherToken.code, tokenData: voucherToken };
      }

      if (PHONE_REGEX.test(trimmed.replace(/\s+/g, ""))) {
        return { type: "customer", phone: trimmed.replace(/\s+/g, "") };
      }

      // Try to match by variant barcode/SKU first
      const variantMatch = findProductByBarcode(products, trimmed);
      if (variantMatch) {
        return {
          type: "product",
          product: variantMatch.product,
          selectedSize: variantMatch.size?.id,
          selectedFlavor: variantMatch.flavor?.id,
        };
      }

      // Fallback to text search
      const normalizedSearch = trimmed.toLowerCase();
      const matchedProduct = products.find((product) => {
        if (!isProductSellableToday(product)) return false;
        const haystack = [
          product.name,
          product.description,
          product.sku,
          product.barcode,
          ...(product.tags ?? []),
          ...(product.searchKeywords ?? []),
          ...(product.occasionTags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });

      if (matchedProduct) {
        return { type: "product", product: matchedProduct };
      }

      return { type: "unknown", raw: trimmed };
    },
    [products],
  );

  const processInput = useCallback(
    (raw: string) => {
      const action = classifyInput(raw);
      setLastAction(action);

      switch (action.type) {
        case "product":
          onAddProduct(action.product, {
            selectedSize: action.selectedSize,
            selectedFlavor: action.selectedFlavor,
          });
          break;
        case "voucher":
          onScanVoucher(action.code, action.tokenData);
          break;
        case "customer":
          onScanCustomer(action.phone);
          break;
      }

      window.setTimeout(() => setLastAction(null), 2000);
    },
    [classifyInput, onAddProduct, onScanVoucher, onScanCustomer],
  );

  const handleInput = useCallback(
    (value: string, onChange: (value: string) => void) => {
      onChange(value);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      bufferRef.current = value;

      timeoutRef.current = window.setTimeout(() => {
        const buffered = bufferRef.current.trim();
        if (buffered) {
          processInput(buffered);
          onChange("");
        }
        bufferRef.current = "";
      }, SCANNER_TIMEOUT_MS);
    },
    [processInput],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, value: string, onChange: (value: string) => void) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          processInput(trimmed);
          onChange("");
        }
        bufferRef.current = "";
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      }
    },
    [processInput],
  );

  return {
    lastAction,
    handleInput,
    handleKeyDown,
  };
}
