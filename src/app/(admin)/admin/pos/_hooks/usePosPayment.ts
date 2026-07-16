import { useEffect, useRef, useState } from "react";
import type { CartItem } from "@/types";
import type { SelectedVoucher } from "@/types/voucher";
import {
  publishPosDisplaySnapshot,
  type PosDisplaySnapshot,
} from "@/store/posDisplayStore";
import {
  buildReceiptText,
  PosCheckoutResult,
  PosPaymentMethod,
  resolvePaymentQrImageSrc,
} from "../_lib/pos-utils";

const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;

type PosPaymentState = {
  paymentMethod: PosPaymentMethod;
  cashReceived: number;
  isSubmitting: boolean;
  error: string | null;
  message: string | null;
  awaitingOrderId: string | null;
  awaitingPaymentDisplay: Omit<PosDisplaySnapshot, "updatedAt"> | null;
  paymentDeadline: number | null;
  clockTick: number;
  completedDisplay: Omit<PosDisplaySnapshot, "updatedAt"> | null;
  payosEnabled: boolean | null;
};

export function usePosPayment({
  items,
  totalPrice,
  customer,
  selectedVoucher,
  voucherPricing,
  onReloadCatalog,
}: {
  items: CartItem[];
  totalPrice: number;
  customer: { name: string; phone: string; id?: string };
  selectedVoucher?: SelectedVoucher;
  voucherPricing: {
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
    isEligible: boolean;
  };
  onReloadCatalog: () => Promise<void>;
}) {
  const [state, setState] = useState<PosPaymentState>({
    paymentMethod: "cash",
    cashReceived: 0,
    isSubmitting: false,
    error: null,
    message: null,
    awaitingOrderId: null,
    awaitingPaymentDisplay: null,
    paymentDeadline: null,
    clockTick: 0,
    completedDisplay: null,
    payosEnabled: null,
  });

  const paymentPollingTimerRef = useRef<number | null>(null);
  const paymentDeadlineRef = useRef<number | null>(null);
  const checkoutIdempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    fetch("/api/pos/config")
      .then((response) => response.json())
      .then((data: { payosEnabled?: boolean }) =>
        setState((previous) => ({
          ...previous,
          payosEnabled: Boolean(data.payosEnabled),
        })),
      )
      .catch(() =>
        setState((previous) => ({ ...previous, payosEnabled: false })),
      );
  }, []);

  useEffect(() => {
    return () => {
      if (paymentPollingTimerRef.current) {
        window.clearTimeout(paymentPollingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!state.paymentDeadline) return;
    const timer = window.setInterval(
      () => setState((previous) => ({ ...previous, clockTick: previous.clockTick + 1 })),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [state.paymentDeadline]);

  useEffect(() => {
    if (state.completedDisplay) {
      publishPosDisplaySnapshot(state.completedDisplay);
      return;
    }
    if (state.awaitingPaymentDisplay) {
      publishPosDisplaySnapshot(state.awaitingPaymentDisplay);
      return;
    }

    const discountAmount =
      selectedVoucher && voucherPricing.isEligible
        ? voucherPricing.discountAmount
        : 0;

    publishPosDisplaySnapshot({
      status: items.length > 0 ? "editing" : "idle",
      items,
      subtotal: totalPrice,
      discountAmount,
      totalAmount: Math.max(0, totalPrice - discountAmount),
      customerName: customer.name.trim() || undefined,
      customerPhone: customer.phone.trim() || undefined,
      voucher: selectedVoucher,
      paymentMethod: state.paymentMethod,
      loyaltyPointsEarned: 0,
    });
  }, [
    state.completedDisplay,
    state.awaitingPaymentDisplay,
    state.paymentMethod,
    customer.name,
    customer.phone,
    items,
    selectedVoucher,
    totalPrice,
    voucherPricing.discountAmount,
    voucherPricing.isEligible,
  ]);

  function cancelAwaitingPayment(note?: string) {
    setState((previous) => ({
      ...previous,
      awaitingPaymentDisplay: null,
      awaitingOrderId: null,
      paymentDeadline: null,
      ...(note ? { message: note } : {}),
    }));
    paymentDeadlineRef.current = null;
    if (paymentPollingTimerRef.current) {
      window.clearTimeout(paymentPollingTimerRef.current);
      paymentPollingTimerRef.current = null;
    }
  }

  async function cancelPendingPayment(note: string) {
    const orderId = state.awaitingOrderId;
    cancelAwaitingPayment(note);
    checkoutIdempotencyKeyRef.current = crypto.randomUUID();
    if (!orderId) return;

    try {
      const response = await fetch(`/api/pos/checkout/${orderId}/cancel`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể huỷ mã QR.");
    } catch (cancelError) {
      setState((previous) => ({
        ...previous,
        error:
          cancelError instanceof Error
            ? cancelError.message
            : "Không thể huỷ mã QR.",
      }));
    }
  }

  function beginAwaitingPayment(
    order: PosCheckoutResult,
    qrImageSrc: string,
  ) {
    const deadline = Date.now() + PAYMENT_TIMEOUT_MS;
    const snapshot: Omit<PosDisplaySnapshot, "updatedAt"> = {
      status: "awaiting_payment",
      items,
      subtotal: totalPrice,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      customerName: customer.name.trim() || undefined,
      customerPhone: customer.phone.trim() || undefined,
      voucher: selectedVoucher,
      paymentMethod: "bank_transfer",
      paymentQrCode: qrImageSrc,
      paymentCheckoutUrl: order.payos?.checkoutUrl,
      orderNumber: order.orderNumber,
      loyaltyPointsEarned: 0,
    };

    paymentDeadlineRef.current = deadline;
    setState((previous) => ({
      ...previous,
      paymentDeadline: deadline,
      awaitingPaymentDisplay: snapshot,
      awaitingOrderId: order.id,
    }));
    publishPosDisplaySnapshot(snapshot);
    pollOrderPayment(order);
    setState((previous) => ({
      ...previous,
      message: `Đơn ${order.orderNumber} đang chờ khách quét mã QR.`,
    }));
  }

  async function pollOrderPayment(order: PosCheckoutResult) {
    if (paymentPollingTimerRef.current) {
      window.clearTimeout(paymentPollingTimerRef.current);
    }

    const poll = async () => {
      try {
        if (
          paymentDeadlineRef.current &&
          Date.now() >= paymentDeadlineRef.current
        ) {
          void cancelPendingPayment(
            `Hết thời gian chờ thanh toán cho đơn ${order.orderNumber}. Bạn có thể tạo QR mới.`,
          );
          return;
        }

        const response = await fetch(`/api/pos/checkout/${order.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as
          | {
              paymentStatus?: "unpaid" | "pending" | "paid" | "refunded";
              status?: string;
              totalAmount?: number;
              orderNumber?: string;
            }
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data ? data.error : "Không thể kiểm tra thanh toán.",
          );
        }

        const isPaid =
          ("paymentStatus" in data && data.paymentStatus === "paid") ||
          ("status" in data && data.status === "completed");

        if (isPaid) {
          await finalizePaidOrder(
            {
              ...order,
              totalAmount: data.totalAmount ?? order.totalAmount,
              orderNumber: data.orderNumber ?? order.orderNumber,
              paymentStatus: "paid",
            },
            { shouldPrintReceipt: false },
          );
          return;
        }

        paymentPollingTimerRef.current = window.setTimeout(poll, 1500);
      } catch (pollError) {
        console.error("POS payment polling failed:", pollError);
        paymentPollingTimerRef.current = window.setTimeout(poll, 3000);
      }
    };

    paymentPollingTimerRef.current = window.setTimeout(poll, 1500);
  }

  async function finalizePaidOrder(
    order: PosCheckoutResult,
    options: { shouldPrintReceipt?: boolean } = {},
  ) {
    cancelAwaitingPayment();

    const paidDiscount =
      selectedVoucher && voucherPricing.isEligible
        ? voucherPricing.discountAmount
        : order.discountAmount;

    setState((previous) => ({
      ...previous,
      completedDisplay: {
        status: "thank_you",
        items,
        subtotal: totalPrice,
        discountAmount: paidDiscount,
        totalAmount: order.totalAmount,
        customerName: customer.name.trim() || undefined,
        customerPhone: customer.phone.trim() || undefined,
        voucher: selectedVoucher,
        paymentMethod: state.paymentMethod,
        orderNumber: order.orderNumber,
        loyaltyPointsEarned: order.loyaltyPointsEarned,
      },
    }));

    if (options.shouldPrintReceipt !== false) {
      printReceipt(order);
    }

    checkoutIdempotencyKeyRef.current = crypto.randomUUID();
    await onReloadCatalog();
    window.setTimeout(() => {
      setState((previous) => ({ ...previous, completedDisplay: null }));
    }, 9000);
    setState((previous) => ({
      ...previous,
      message: `Đã tạo đơn ${order.orderNumber}.`,
    }));
  }

  function printReceipt(order: PosCheckoutResult) {
    const receipt = buildReceiptText({
      order,
      items,
      subtotal: totalPrice,
      customer,
    });
    const printWindow = window.open("", "_blank", "width=420,height=680");
    if (!printWindow) return;

    printWindow.document.write(
      `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${receipt}</pre>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function submitOrder(orderNote: string) {
    if (items.length === 0 || state.isSubmitting || Boolean(state.awaitingPaymentDisplay))
      return;

    if (state.paymentMethod === "bank_transfer" && state.payosEnabled === false) {
      setState((previous) => ({
        ...previous,
        error:
          "PayOS chưa được cấu hình. Không thể thanh toán QR. Vui lòng dùng tiền mặt hoặc cấu hình PayOS.",
      }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isSubmitting: true,
      error: null,
      message: null,
    }));

    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          customerId: customer.id,
          customerName: customer.name.trim(),
          customerPhone: customer.phone.trim().replace(/\s+/g, ""),
          items,
          voucherCode: selectedVoucher?.code,
          voucherId: selectedVoucher?.id,
          paymentMethod: state.paymentMethod,
          cashReceived: state.paymentMethod === "cash" ? state.cashReceived : undefined,
          note: orderNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as
        | PosCheckoutResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data ? data.error : "Không thể thanh toán.",
        );
      }

      const order = data as PosCheckoutResult;

      if (state.paymentMethod === "bank_transfer") {
        if (order.paymentStatus !== "pending") {
          throw new Error("Đơn QR không ở trạng thái chờ thanh toán.");
        }

        const qrImageSrc = resolvePaymentQrImageSrc(order.payos);
        if (!qrImageSrc) {
          throw new Error(
            "Không tạo được mã QR thanh toán. Vui lòng thử lại hoặc chọn tiền mặt.",
          );
        }

        beginAwaitingPayment(order, qrImageSrc);
        return;
      }

      if (order.paymentStatus && order.paymentStatus !== "paid") {
        throw new Error("Đơn chưa được thanh toán.");
      }

      await finalizePaidOrder(order);
    } catch (submitError) {
      console.error("POS checkout failed:", submitError);
      setState((previous) => ({
        ...previous,
        error:
          submitError instanceof Error
            ? submitError.message
            : "Không thể thanh toán.",
      }));
    } finally {
      setState((previous) => ({ ...previous, isSubmitting: false }));
    }
  }

  function resetPayment() {
    checkoutIdempotencyKeyRef.current = crypto.randomUUID();
    setState((previous) => ({
      ...previous,
      completedDisplay: null,
      paymentMethod: "cash",
      cashReceived: 0,
    }));
    cancelAwaitingPayment();
  }

  return {
    ...state,
    setPaymentMethod: (method: PosPaymentMethod) =>
      setState((previous) => ({ ...previous, paymentMethod: method })),
    setCashReceived: (value: number) =>
      setState((previous) => ({ ...previous, cashReceived: value })),
    submitOrder,
    cancelPendingPayment,
    resetPayment,
    printReceipt: state.completedDisplay ? printReceipt : undefined,
  };
}
