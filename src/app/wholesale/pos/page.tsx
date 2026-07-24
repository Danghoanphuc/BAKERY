"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import type { SelectedVoucher } from "@/types/voucher";
import type { PosVoucherTokenPayload } from "@/lib/pos-voucher-token";
import { usePosCartStore } from "@/store/posCartStore";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { PosProductGrid } from "./_components/PosProductGrid";
import { PosCartPanel } from "./_components/PosCartPanel";
import { PosCheckoutPanel } from "./_components/PosCheckoutPanel";
import { PosCustomerBox } from "./_components/PosCustomerBox";
import { PosVoucherBox } from "./_components/PosVoucherBox";
import { PosProductCustomizerModal } from "./_components/PosProductCustomizerModal";
import { PosSkeleton } from "./_components/PosSkeleton";
import { usePosCatalog } from "./_hooks/usePosCatalog";
import { usePosPayment } from "./_hooks/usePosPayment";
import { usePosHeldOrders } from "./_hooks/usePosHeldOrders";
import { usePosScanner } from "./_hooks/usePosScanner";
import {
  getOrCreatePosDisplaySession,
  getPosDisplayUrl,
  POS_DISPLAY_SESSION_CHANGED_EVENT,
  type PosDisplaySessionConfig,
} from "@/store/posDisplayStore";
import {
  buildPosCartItem,
  isProductSellableToday,
  PosCustomer,
  productNeedsCustomization,
} from "./_lib/pos-utils";

type ProductCustomizationRequest = {
  product: Product;
  selectedSize?: string;
  selectedFlavor?: string;
};

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

  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [customizationRequest, setCustomizationRequest] =
    useState<ProductCustomizationRequest | null>(null);
  const [customer, setCustomer] = useState<PosCustomer>({
    name: "",
    phone: "",
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<SelectedVoucher>();
  const [orderNote, setOrderNote] = useState("");
  const [displaySession, setDisplaySession] =
    useState<PosDisplaySessionConfig | null>(null);

  useEffect(() => {
    let active = true;
    const handleSessionChange = (event: Event) => {
      if (!active) return;
      setDisplaySession(
        (event as CustomEvent<PosDisplaySessionConfig>).detail,
      );
    };
    window.addEventListener(
      POS_DISPLAY_SESSION_CHANGED_EVENT,
      handleSessionChange,
    );
    void getOrCreatePosDisplaySession()
      .then((session) => {
        if (active) setDisplaySession(session);
      })
      .catch((error) => console.error("POS display session failed:", error));
    return () => {
      active = false;
      window.removeEventListener(
        POS_DISPLAY_SESSION_CHANGED_EVENT,
        handleSessionChange,
      );
    };
  }, []);

  const { products, categories, isLoading, loadCatalog, filterProducts } =
    usePosCatalog();

  const { heldOrders, holdOrder, restoreHeldOrder } = usePosHeldOrders();

  const voucherPricing = useMemo(
    () => calculateVoucherPricing(totalPrice, selectedVoucher),
    [selectedVoucher, totalPrice],
  );

  const payment = usePosPayment({
    items,
    totalPrice,
    customer,
    selectedVoucher,
    voucherPricing,
    onReloadCatalog: loadCatalog,
    onSaleCompleted: clearCompletedSale,
  });

  function clearCompletedSale() {
    clearCart();
    setCustomer({ name: "", phone: "" });
    setVoucherCode("");
    setSelectedVoucher(undefined);
    setOrderNote("");
  }

  function handleScannerAddProduct(product: Product, options?: { selectedSize?: string; selectedFlavor?: string }) {
    if (payment.awaitingPaymentDisplay || !isProductSellableToday(product)) return false;

    const needsSize = Boolean(product.sizeOptions?.length && !options?.selectedSize);
    const needsFlavor = Boolean(product.flavorOptions?.length && !options?.selectedFlavor);
    if (needsSize || needsFlavor || product.requiresMessage) {
      setCustomizationRequest({
        product,
        selectedSize: options?.selectedSize,
        selectedFlavor: options?.selectedFlavor,
      });
      return true;
    }
    addItem(buildPosCartItem(product, 1, { selectedSize: options?.selectedSize, selectedFlavor: options?.selectedFlavor }));
    return true;
  }

  async function handleScanVoucher(
    code: string,
    tokenData?: PosVoucherTokenPayload | null,
  ) {
    if (tokenData?.customerPhone) {
      setCustomer((previous) => ({
        ...previous,
        phone: tokenData.customerPhone ?? previous.phone,
        name: tokenData.customerName ?? previous.name,
      }));
    }

    if (totalPrice <= 0) {
      setVoucherCode(code);
      return true;
    }

    try {
      const response = await fetch("/api/wholesale/pos/vouchers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          customerId: customer.id,
          phone: tokenData?.customerPhone ?? customer.phone,
          subtotal: totalPrice,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        voucher?: { id: string; code: string; title: string; discountType: string; discountValue: number; maxDiscountAmount?: number; minOrderValue?: number };
        pricing?: { isEligible: boolean; discountAmount: number; reason?: string };
        reason?: string;
        customer?: { id?: string; name: string; phone: string; isNew?: boolean; loyaltyPoints?: number; tier?: string };
      };

      if (!response.ok) {
        setVoucherCode(code);
        return false;
      }

      if (data.customer?.phone) {
        setCustomer({
          id: data.customer.isNew ? undefined : data.customer.id,
          name: data.customer.name,
          phone: data.customer.phone,
          loyaltyPoints: data.customer.loyaltyPoints,
          tier: data.customer.tier,
        });
      }

      if (!data.ok || !data.voucher) {
        setVoucherCode(code);
        return false;
      }

      setSelectedVoucher({
        id: data.voucher.id,
        code: data.voucher.code,
        title: data.voucher.title,
        useMode: "pos_pickup_now",
        discountType: data.voucher.discountType as "percent" | "fixed",
        discountValue: data.voucher.discountValue,
        maxDiscountAmount: data.voucher.maxDiscountAmount,
        minOrderValue: data.voucher.minOrderValue,
      });
      setVoucherCode(data.voucher.code);
      return true;
    } catch (error) {
      console.error("POS scan voucher failed:", error);
      setVoucherCode(code);
      return false;
    }
  }

  async function handleScanCustomer(query: string) {
    try {
      const response = await fetch(
        `/api/wholesale/pos/customers/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) return false;
      const data = (await response.json()) as {
        customers?: Array<{ id: string; name: string; phone: string; tier?: string; loyaltyPoints?: number; totalOrders?: number }>;
      };
      const found = data.customers?.[0];
      if (found) {
        setCustomer({
          id: found.id,
          name: found.name,
          phone: found.phone,
          tier: found.tier,
          loyaltyPoints: found.loyaltyPoints,
          totalOrders: found.totalOrders,
        });
        return true;
      }

      if (/^0[0-9]{9}$/.test(query)) {
        setCustomer((previous) => ({ ...previous, phone: query }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("POS scan customer failed:", error);
      return false;
    }
  }

  const { feedback, handleSearchKeyDown } = usePosScanner({
    products,
    onAddProduct: handleScannerAddProduct,
    onScanVoucher: handleScanVoucher,
    onScanCustomer: handleScanCustomer,
  });

  useEffect(() => {
    if (feedback.status === "ready") return;
    const notify = feedback.status === "error" ? toast.error : toast.success;
    notify(feedback.message, { id: "pos-scanner-feedback" });
  }, [feedback.message, feedback.status]);

  useEffect(() => {
    if (payment.error) {
      toast.error(payment.error, { id: "pos-payment-feedback" });
      return;
    }
    if (payment.message) {
      const notify = payment.message.startsWith("Đã tạo") ? toast.success : toast.info;
      notify(payment.message, { id: "pos-payment-feedback" });
    }
  }, [payment.error, payment.message]);

  const filteredProducts = useMemo(
    () => filterProducts(products, searchTerm, selectedCategory),
    [products, searchTerm, selectedCategory, filterProducts],
  );

  function resetCurrentSale() {
    payment.resetPayment();
    clearCart();
    setCustomer({ name: "", phone: "" });
    setVoucherCode("");
    setSelectedVoucher(undefined);
    setOrderNote("");
  }

  function handleProductClick(product: Product) {
    if (payment.awaitingPaymentDisplay) return;

    if (!isProductSellableToday(product)) return;
    if (productNeedsCustomization(product)) {
      setCustomizationRequest({ product });
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
    if (!customizationRequest) return;

    addItem(
      buildPosCartItem(customizationRequest.product, customization.quantity, customization),
    );
    setCustomizationRequest(null);
  }

  function handleHoldOrder() {
    if (payment.awaitingPaymentDisplay) return;
    holdOrder({ items, customer, voucher: selectedVoucher, note: orderNote });
    resetCurrentSale();
  }

  function handleRestoreHeldOrder(order: Parameters<typeof restoreHeldOrder>[0]) {
    if (payment.awaitingPaymentDisplay) return;
    if (items.length > 0) {
      holdOrder({
        items,
        customer,
        voucher: selectedVoucher,
        note: orderNote,
      });
    }
    const restored = restoreHeldOrder(order);
    if (restored) {
      setItems(restored.items);
      setCustomer(restored.customer);
      setSelectedVoucher(restored.voucher);
      setVoucherCode(restored.voucher?.code ?? "");
      setOrderNote(restored.note ?? "");
      payment.resetPayment();
    }
  }

  function handleSubmitOrder() {
    void payment.submitOrder(orderNote);
  }

  if (isLoading) {
    return <PosSkeleton />;
  }

  const showCartPanel = items.length > 0 || heldOrders.length > 0;

  return (
    <div
      className={
        showCartPanel
          ? "grid min-h-0 grid-cols-1 overflow-visible rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm md:h-[calc(100vh-3rem)] md:grid-cols-[minmax(0,1fr)_320px] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_minmax(640px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_720px]"
          : "grid min-h-0 grid-cols-1 overflow-visible rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm md:h-[calc(100vh-3rem)] md:grid-cols-[minmax(0,1fr)_320px] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]"
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
        customerDisplayUrl={displaySession ? getPosDisplayUrl(displaySession) : undefined}
        customerDisplayTarget={
          displaySession
            ? `bakery-pos-customer-display-${displaySession.sessionId}`
            : undefined
        }
        onScannerKeyDown={(event) => handleSearchKeyDown(event, searchTerm, setSearchTerm)}
        scannerStatus={feedback.status}
      />

      <div
        className={
          showCartPanel
            ? "min-h-0 border-t border-[#f0e1d2] bg-white md:col-start-2 md:h-full md:overflow-y-auto md:border-l md:border-t-0 xl:grid xl:grid-cols-[minmax(280px,0.95fr)_minmax(320px,1.05fr)] xl:overflow-hidden"
            : "contents"
        }
      >
        {showCartPanel && (
        <aside className="flex min-h-0 flex-col border-b border-[#f0e1d2] bg-white xl:border-b-0 xl:border-r">
          <PosCartPanel
            items={items}
            totalQuantity={totalQuantity}
            subtotal={totalPrice}
            heldOrders={heldOrders}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onClear={resetCurrentSale}
            onHoldOrder={handleHoldOrder}
            onRestoreHeldOrder={handleRestoreHeldOrder}
            isLocked={Boolean(payment.awaitingPaymentDisplay)}
          />
        </aside>
        )}

      <aside
        className={
          showCartPanel
            ? "flex min-h-0 flex-col bg-white xl:overflow-y-auto"
            : "flex min-h-0 flex-col overflow-y-auto border-t border-[#f0e1d2] bg-white md:col-start-2 md:row-start-1 md:border-l md:border-t-0"
        }
      >
        {payment.payosEnabled === false &&
          payment.paymentMethod === "bank_transfer" && (
            <div className="border-b border-[#f0e1d2] px-4 py-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                PayOS chưa được cấu hình. Chọn QR/CK sẽ không tạo được mã
                thanh toán.
              </div>
            </div>
          )}

        {payment.awaitingPaymentDisplay && payment.paymentDeadline && (
          <div className="border-b border-[#f0e1d2] bg-[#fffaf6] px-4 py-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-900">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">
                    Đang chờ khách thanh toán (đơn{" "}
                    <span className="font-black">
                      {payment.awaitingPaymentDisplay.orderNumber ?? "—"}
                    </span>
                    )
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    Còn{" "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (payment.paymentDeadline -
                          (Date.now() + payment.clockTick * 0)) /
                          1000,
                      ),
                    )}{" "}
                    giây (tự huỷ khi hết giờ).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void payment.cancelPendingPayment(
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
          stackedOnTablet={showCartPanel}
          selectedVoucher={selectedVoucher}
          voucherPricing={voucherPricing}
          paymentMethod={payment.paymentMethod}
          canSubmit={
            items.length > 0 &&
            !payment.awaitingPaymentDisplay &&
            (payment.paymentMethod !== "cash" ||
              payment.cashReceived >=
                (selectedVoucher && voucherPricing.isEligible
                  ? voucherPricing.totalAfterDiscount
                  : voucherPricing.subtotal))
          }
          isSubmitting={payment.isSubmitting}
          cashReceived={payment.cashReceived}
          orderNote={orderNote}
          onCashReceivedChange={payment.setCashReceived}
          onPaymentMethodChange={payment.setPaymentMethod}
          onOrderNoteChange={setOrderNote}
          onSubmit={handleSubmitOrder}
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
      </div>

      {customizationRequest && (
        <PosProductCustomizerModal
          product={customizationRequest.product}
          isOpen={Boolean(customizationRequest)}
          initialSelectedSize={customizationRequest.selectedSize}
          initialSelectedFlavor={customizationRequest.selectedFlavor}
          onClose={() => setCustomizationRequest(null)}
          onAdd={handleCustomizedAdd}
        />
      )}
    </div>
  );
}
