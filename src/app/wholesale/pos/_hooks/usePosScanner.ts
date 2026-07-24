import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { parsePosVoucherToken } from "@/lib/pos-voucher-token";
import { isProductSellableToday } from "../_lib/pos-utils";

export type ScannerAction =
  | { type: "product"; product: Product; selectedSize?: string; selectedFlavor?: string }
  | { type: "voucher"; code: string; tokenData?: ReturnType<typeof parsePosVoucherToken> }
  | { type: "customer"; query: string }
  | { type: "unknown"; raw: string };

export type ScannerFeedback = {
  status: "ready" | "success" | "error";
  message: string;
};

type ScannerCallbackResult = void | boolean | Promise<void | boolean>;

const PHONE_REGEX = /^0[0-9]{9}$/;
const SCAN_MAX_KEY_GAP_MS = 80;
const SCAN_RESET_GAP_MS = 140;
const SCAN_MIN_LENGTH = 3;

type ScannerSequence = {
  value: string;
  startedAt: number;
  lastAt: number;
  maxGap: number;
};

function matchesIdentifier(value: string | undefined, normalized: string) {
  return Boolean(value && value.trim().toLowerCase() === normalized);
}

function findProductByIdentifier(products: Product[], raw: string) {
  const normalized = raw.trim().toLowerCase();

  for (const product of products) {
    if (!isProductSellableToday(product)) continue;

    for (const combination of product.variantCombinations ?? []) {
      if (
        matchesIdentifier(combination.barcode, normalized) ||
        matchesIdentifier(combination.sku, normalized)
      ) {
        return {
          product,
          selectedSize: combination.sizeOptionId,
          selectedFlavor: combination.flavorOptionId,
        };
      }
    }

    if (
      matchesIdentifier(product.barcode, normalized) ||
      matchesIdentifier(product.sku, normalized)
    ) {
      return { product };
    }

    for (const size of product.sizeOptions ?? []) {
      if (
        matchesIdentifier(size.barcode, normalized) ||
        matchesIdentifier(size.sku, normalized)
      ) {
        return { product, selectedSize: size.id };
      }
    }

    for (const flavor of product.flavorOptions ?? []) {
      if (
        matchesIdentifier(flavor.barcode, normalized) ||
        matchesIdentifier(flavor.sku, normalized)
      ) {
        return { product, selectedFlavor: flavor.id };
      }
    }
  }

  return null;
}

export function classifyScannerInput(products: Product[], raw: string): ScannerAction {
  const trimmed = raw.trim();
  if (!trimmed) return { type: "unknown", raw: trimmed };

  const prefixMatch = trimmed.match(/^([PVC]):\s*(.+)$/i);
  if (prefixMatch) {
    const [, prefix, payload] = prefixMatch;
    const value = payload.trim();

    if (prefix.toUpperCase() === "V") {
      const tokenData = parsePosVoucherToken(value);
      return {
        type: "voucher",
        code: tokenData?.code ?? value,
        tokenData: tokenData ?? undefined,
      };
    }

    if (prefix.toUpperCase() === "C") {
      return { type: "customer", query: value };
    }

    const productMatch = findProductByIdentifier(products, value);
    return productMatch
      ? { type: "product", ...productMatch }
      : { type: "unknown", raw: trimmed };
  }

  const voucherToken = parsePosVoucherToken(trimmed);
  if (voucherToken) {
    return { type: "voucher", code: voucherToken.code, tokenData: voucherToken };
  }

  const productMatch = findProductByIdentifier(products, trimmed);
  if (productMatch) return { type: "product", ...productMatch };

  const compact = trimmed.replace(/\s+/g, "");
  if (PHONE_REGEX.test(compact)) {
    return { type: "customer", query: compact };
  }

  return { type: "unknown", raw: trimmed };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function usePosScanner({
  products,
  onAddProduct,
  onScanVoucher,
  onScanCustomer,
}: {
  products: Product[];
  onAddProduct: (product: Product, options?: { selectedSize?: string; selectedFlavor?: string }) => ScannerCallbackResult;
  onScanVoucher: (code: string, tokenData?: ReturnType<typeof parsePosVoucherToken>) => ScannerCallbackResult;
  onScanCustomer: (query: string) => ScannerCallbackResult;
}) {
  const [lastAction, setLastAction] = useState<ScannerAction | null>(null);
  const [feedback, setFeedback] = useState<ScannerFeedback>({
    status: "ready",
    message: "Scanner HID sẵn sàng · hậu tố Enter",
  });
  const sequenceRef = useRef<ScannerSequence | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback((next: ScannerFeedback) => {
    setFeedback(next);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback({ status: "ready", message: "Scanner HID sẵn sàng · hậu tố Enter" });
      setLastAction(null);
    }, 3500);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  const recordPrintableKey = useCallback((key: string, timestamp: number) => {
    const previous = sequenceRef.current;
    if (!previous || timestamp - previous.lastAt > SCAN_RESET_GAP_MS) {
      sequenceRef.current = {
        value: key,
        startedAt: timestamp,
        lastAt: timestamp,
        maxGap: 0,
      };
      return;
    }

    const gap = timestamp - previous.lastAt;
    sequenceRef.current = {
      ...previous,
      value: previous.value + key,
      lastAt: timestamp,
      maxGap: Math.max(previous.maxGap, gap),
    };
  }, []);

  const consumeScannerSequence = useCallback((value: string, timestamp: number) => {
    const sequence = sequenceRef.current;
    sequenceRef.current = null;
    if (!sequence) return false;

    const normalizedValue = value.trim();
    const elapsed = timestamp - sequence.startedAt;
    const enterGap = timestamp - sequence.lastAt;
    return (
      normalizedValue.length >= SCAN_MIN_LENGTH &&
      sequence.value.trim() === normalizedValue &&
      sequence.maxGap <= SCAN_MAX_KEY_GAP_MS &&
      enterGap <= SCAN_RESET_GAP_MS &&
      elapsed <= Math.max(500, normalizedValue.length * SCAN_MAX_KEY_GAP_MS)
    );
  }, []);

  const processInput = useCallback(
    async (raw: string) => {
      const action = classifyScannerInput(products, raw);
      setLastAction(action);

      if (action.type === "unknown") {
        showFeedback({ status: "error", message: `Không nhận diện mã: ${action.raw}` });
        return false;
      }

      let result: void | boolean;
      if (action.type === "product") {
        result = await onAddProduct(action.product, {
          selectedSize: action.selectedSize,
          selectedFlavor: action.selectedFlavor,
        });
        showFeedback({
          status: result === false ? "error" : "success",
          message: result === false ? "Chưa thể thêm sản phẩm lúc này" : `Đã quét: ${action.product.name}`,
        });
      } else if (action.type === "voucher") {
        result = await onScanVoucher(action.code, action.tokenData);
        showFeedback({
          status: result === false ? "error" : "success",
          message: result === false ? `Voucher không hợp lệ: ${action.code}` : `Đã nhận voucher: ${action.code}`,
        });
      } else {
        result = await onScanCustomer(action.query);
        showFeedback({
          status: result === false ? "error" : "success",
          message: result === false ? `Không tìm thấy khách: ${action.query}` : `Đã nhận khách: ${action.query}`,
        });
      }

      return result !== false;
    },
    [onAddProduct, onScanCustomer, onScanVoucher, products, showFeedback],
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Enter") {
        const value = sequenceRef.current?.value ?? "";
        if (consumeScannerSequence(value, event.timeStamp)) {
          event.preventDefault();
          void processInput(value);
        }
        return;
      }

      if (event.key.length === 1) recordPrintableKey(event.key, event.timeStamp);
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [consumeScannerSequence, processInput, recordPrintableKey]);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, value: string, onChange: (value: string) => void) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.nativeEvent.isComposing) return;

      if (event.key === "Enter") {
        if (consumeScannerSequence(value, event.timeStamp)) {
          event.preventDefault();
          void processInput(value);
          onChange("");
        }
        return;
      }

      if (event.key.length === 1) recordPrintableKey(event.key, event.timeStamp);
    },
    [consumeScannerSequence, processInput, recordPrintableKey],
  );

  return { lastAction, feedback, handleSearchKeyDown };
}
