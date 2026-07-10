"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product } from "@/types";
import type { SelectedVoucher } from "@/types/voucher";
import { usePosCartStore } from "@/store/posCartStore";
import {
  publishPosDisplaySnapshot,
  type PosDisplaySnapshot,
} from "@/store/posDisplayStore";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { PosProductGrid } from "./_components/PosProductGrid";
import { PosCartPanel } from "./_components/PosCartPanel";
import { PosCheckoutPanel } from "./_components/PosCheckoutPanel";
import { PosCustomerBox } from "./_components/PosCustomerBox";
import { PosVoucherBox } from "./_components/PosVoucherBox";
import { PosProductCustomizerModal } from "./_components/PosProductCustomizerModal";
import {
  buildPosCartItem,
  buildReceiptText,
  HeldPosOrder,
  isProductSellableToday,
  normalizePhone,
  PosCheckoutResult,
  PosCustomer,
  PosPaymentMethod,
  productNeedsCustomization,
  resolvePaymentQrImageSrc,
} from "./_lib/pos-utils";

const HELD_ORDERS_STORAGE_KEY = "bakery-pos-held-orders";
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;

export default function POSPage() {
  const {
    items,
    totalQuantity,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setItems,
  } = usePosCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customer, setCustomer] = useState<PosCustomer>({
    name: "",
    phone: "",
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<SelectedVoucher>();
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedDisplay, setCompletedDisplay] = useState<Omit<
    PosDisplaySnapshot,
    "updatedAt"
  > | null>(null);
  const [awaitingPaymentDisplay, setAwaitingPaymentDisplay] = useState<Omit<
    PosDisplaySnapshot,
    "updatedAt"
  > | null>(null);
  const paymentPollingTimerRef = useRef<number | null>(null);
  const paymentDeadlineRef = useRef<number | null>(null);
  const [paymentDeadline, setPaymentDeadline] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [payosEnabled, setPayosEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadCatalog();
    fetch("/api/pos/config")
      .then((response) => response.json())
      .then((data: { payosEnabled?: boolean }) =>
        setPayosEnabled(Boolean(data.payosEnabled)),
      )
      .catch(() => setPayosEnabled(false));
  }, []);

  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(HELD_ORDERS_STORAGE_KEY);
      if (savedOrders) {
        setHeldOrders(JSON.parse(savedOrders) as HeldPosOrder[]);
      }
    } catch (storageError) {
      console.error("Failed to load held POS orders:", storageError);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HELD_ORDERS_STORAGE_KEY, JSON.stringify(heldOrders));
    } catch (storageError) {
      console.error("Failed to save held POS orders:", storageError);
    }
  }, [heldOrders]);

  const voucherPricing = useMemo(
    () => calculateVoucherPricing(totalPrice, selectedVoucher),
    [selectedVoucher, totalPrice],
  );

  useEffect(() => {
    return () => {
      if (paymentPollingTimerRef.current) {
        window.clearTimeout(paymentPollingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!paymentDeadline) return;
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paymentDeadline]);

  useEffect(() => {
    if (completedDisplay) {
      publishPosDisplaySnapshot(completedDisplay);
      return;
    }
    if (awaitingPaymentDisplay) {
      publishPosDisplaySnapshot(awaitingPaymentDisplay);
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
      paymentMethod,
      loyaltyPointsEarned: 0,
    });
  }, [
    completedDisplay,
    awaitingPaymentDisplay,
    customer.name,
    customer.phone,
    items,
    paymentMethod,
    selectedVoucher,
    totalPrice,
    voucherPricing.discountAmount,
    voucherPricing.isEligible,
  ]);

  async function loadCatalog() {
    try {
      setIsLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Không thể tải dữ liệu POS.");
      }

      setProducts((await productsResponse.json()) as Product[]);
      setCategories((await categoriesResponse.json()) as Category[]);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load POS catalog:", loadError);
      setError("Không thể tải dữ liệu POS.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products
      .filter((product) =>
        selectedCategory === "all"
          ? true
          : product.categoryId === selectedCategory,
      )
      .filter((product) => {
        if (!normalizedSearch) return true;
        const haystack = [
          product.name,
          product.description,
          ...(product.tags ?? []),
          ...(product.searchKeywords ?? []),
          ...(product.occasionTags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftAvailable = isProductSellableToday(left) ? 1 : 0;
        const rightAvailable = isProductSellableToday(right) ? 1 : 0;
        return (
          rightAvailable - leftAvailable ||
          (right.sortPriority ?? 0) - (left.sortPriority ?? 0) ||
          left.name.localeCompare(right.name)
        );
      });
  }, [products, searchTerm, selectedCategory]);

  function resetCurrentSale() {
    setCompletedDisplay(null);
    cancelAwaitingPayment();
    clearCart();
    setCustomer({ name: "", phone: "" });
    setVoucherCode("");
    setSelectedVoucher(undefined);
    setPaymentMethod("cash");
  }

  function cancelAwaitingPayment(note?: string) {
    setAwaitingPaymentDisplay(null);
    setPaymentDeadline(null);
    paymentDeadlineRef.current = null;
    if (paymentPollingTimerRef.current) {
      window.clearTimeout(paymentPollingTimerRef.current);
      paymentPollingTimerRef.current = null;
    }
    if (note) setMessage(note);
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
    setPaymentDeadline(deadline);
    setAwaitingPaymentDisplay(snapshot);
    publishPosDisplaySnapshot(snapshot);
    pollOrderPayment(order);
    setMessage(`Đơn ${order.orderNumber} đang chờ khách quét mã QR.`);
  }

  function handleProductClick(product: Product) {
    setCompletedDisplay(null);
    cancelAwaitingPayment();
    setMessage(null);
    setError(null);

    if (!isProductSellableToday(product)) return;
    if (productNeedsCustomization(product)) {
      setSelectedProduct(product);
      return;
    }

    addItem(buildPosCartItem(product));
  }

  function handleCustomizedAdd(customization: {
    quantity: number;
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  }) {
    if (!selectedProduct) return;

    const sizeAdjustment =
      selectedProduct.sizeOptions?.find(
        (size) => size.id === customization.selectedSize,
      )?.priceAdjustment ?? 0;

    addItem({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      imageUrl: selectedProduct.imageUrl,
      selectedSize: customization.selectedSize,
      selectedFlavor: customization.selectedFlavor,
      customMessage: customization.customMessage,
      candles: customization.candles,
      price: selectedProduct.price + sizeAdjustment,
      quantity: customization.quantity,
    });
    setSelectedProduct(null);
  }

  function holdOrder() {
    if (items.length === 0) return;

    setHeldOrders((current) => [
      {
        id: crypto.randomUUID(),
        items,
        customer,
        voucher: selectedVoucher,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    resetCurrentSale();
  }

  function restoreHeldOrder(order: HeldPosOrder) {
    setItems(order.items);
    setCustomer(order.customer);
    setSelectedVoucher(order.voucher);
    setVoucherCode(order.voucher?.code ?? "");
    setHeldOrders((current) => current.filter((item) => item.id !== order.id));
  }

  async function submitOrder() {
    if (items.length === 0 || isSubmitting || Boolean(awaitingPaymentDisplay))
      return;

    if (paymentMethod === "bank_transfer" && payosEnabled === false) {
      setError(
        "PayOS chưa được cấu hình. Không thể thanh toán QR. Vui lòng dùng tiền mặt hoặc cấu hình PayOS.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name.trim(),
          customerPhone: normalizePhone(customer.phone),
          items,
          voucherCode: selectedVoucher?.code,
          voucherId: selectedVoucher?.id,
          paymentMethod,
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

      if (paymentMethod === "bank_transfer") {
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể thanh toán.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
          cancelAwaitingPayment(
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
    setCompletedDisplay({
      status: "thank_you",
      items,
      subtotal: totalPrice,
      discountAmount: paidDiscount,
      totalAmount: order.totalAmount,
      customerName: customer.name.trim() || undefined,
      customerPhone: customer.phone.trim() || undefined,
      voucher: selectedVoucher,
      paymentMethod,
      orderNumber: order.orderNumber,
      loyaltyPointsEarned: order.loyaltyPointsEarned,
    });
    if (options.shouldPrintReceipt !== false) {
      printReceipt(order);
    }
    clearCart();
    setCustomer({ name: "", phone: "" });
    setVoucherCode("");
    setSelectedVoucher(undefined);
    setPaymentMethod("cash");
    await loadCatalog();
    window.setTimeout(() => {
      setCompletedDisplay(null);
    }, 9000);
    setMessage(`Đã tạo đơn ${order.orderNumber}.`);
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

  function openCustomerDisplay() {
    window.open("/admin/pos/customer-display", "bakery-pos-customer-display");
  }

  const showCartPanel = items.length > 0 || heldOrders.length > 0;

  return (
    <div
      className={
        showCartPanel
          ? "grid h-[calc(100vh-3rem)] min-h-0 grid-cols-[minmax(0,1fr)_320px_340px] overflow-hidden rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm 2xl:grid-cols-[minmax(0,1fr)_340px_360px]"
          : "grid h-[calc(100vh-3rem)] min-h-0 grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm 2xl:grid-cols-[minmax(0,1fr)_380px]"
      }
    >
      <PosProductGrid
        products={filteredProducts}
        categories={categories}
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchTerm}
        onProductClick={handleProductClick}
        onOpenCustomerDisplay={openCustomerDisplay}
      />

      {showCartPanel && (
        <aside className="flex min-h-0 flex-col border-l border-[#f0e1d2] bg-white">
          <PosCartPanel
            items={items}
            totalQuantity={totalQuantity}
            subtotal={totalPrice}
            heldOrders={heldOrders}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onClear={resetCurrentSale}
            onHoldOrder={holdOrder}
            onRestoreHeldOrder={restoreHeldOrder}
          />
        </aside>
      )}

      <aside className="flex min-h-0 flex-col overflow-y-auto border-l border-[#f0e1d2] bg-white">
        {payosEnabled === false && paymentMethod === "bank_transfer" && (
          <div className="border-b border-[#f0e1d2] px-4 py-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
              PayOS chưa được cấu hình. Chọn QR/CK sẽ không tạo được mã thanh toán.
            </div>
          </div>
        )}

        {(error || message || isLoading) && (
          <div className="border-b border-[#f0e1d2] px-4 py-3">
            <div
              className={
                error
                  ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
              }
            >
              {error || message || (isLoading ? "Đang tải POS..." : null)}
            </div>
          </div>
        )}

        {awaitingPaymentDisplay && paymentDeadline && (
          <div className="border-b border-[#f0e1d2] bg-[#fffaf6] px-4 py-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-900">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">
                    Đang chờ khách thanh toán (đơn{" "}
                    <span className="font-black">
                      {awaitingPaymentDisplay.orderNumber ?? "—"}
                    </span>
                    )
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    Còn{" "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (paymentDeadline - (Date.now() + clockTick * 0)) / 1000,
                      ),
                    )}{" "}
                    giây (tự huỷ khi hết giờ).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    cancelAwaitingPayment(
                      "Đã huỷ chờ thanh toán. Bạn có thể tạo QR mới.",
                    )
                  }
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
                >
                  Huỷ chờ
                </button>
              </div>
            </div>
          </div>
        )}

        <PosCheckoutPanel
          selectedVoucher={selectedVoucher}
          voucherPricing={voucherPricing}
          paymentMethod={paymentMethod}
          canSubmit={items.length > 0 && !awaitingPaymentDisplay}
          isSubmitting={isSubmitting}
          onPaymentMethodChange={setPaymentMethod}
          onSubmit={submitOrder}
        >
          <PosCustomerBox customer={customer} onCustomerChange={setCustomer} />
          <PosVoucherBox
            subtotal={totalPrice}
            customer={customer}
            voucherCode={voucherCode}
            selectedVoucher={selectedVoucher}
            voucherPricing={voucherPricing}
            onVoucherCodeChange={setVoucherCode}
            onApplyVoucher={setSelectedVoucher}
            onClearVoucher={() => {
              setSelectedVoucher(undefined);
              setVoucherCode("");
            }}
            onCustomerDetected={setCustomer}
          />
        </PosCheckoutPanel>
      </aside>

      {selectedProduct && (
        <PosProductCustomizerModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          onAdd={handleCustomizedAdd}
        />
      )}
    </div>
  );
}
