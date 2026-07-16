"use client";

import { useMemo, useState } from "react";
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
  buildPosCartItem,
  isProductSellableToday,
  PosCustomer,
  productNeedsCustomization,
} from "./_lib/pos-utils";

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customer, setCustomer] = useState<PosCustomer>({
    name: "",
    phone: "",
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<SelectedVoucher>();
  const [orderNote, setOrderNote] = useState("");

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
  });

  function handleScannerAddProduct(product: Product, options?: { selectedSize?: string; selectedFlavor?: string }) {
    if (payment.awaitingPaymentDisplay) return;
    if (!isProductSellableToday(product)) return;
    if (productNeedsCustomization(product) && !options?.selectedSize && !options?.selectedFlavor) {
      setSelectedProduct(product);
      return;
    }
    addItem(buildPosCartItem(product, 1, { selectedSize: options?.selectedSize, selectedFlavor: options?.selectedFlavor }));
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
      return;
    }

    try {
      const response = await fetch("/api/pos/vouchers/preview", {
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
        return;
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
        return;
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
    } catch (error) {
      console.error("POS scan voucher failed:", error);
      setVoucherCode(code);
    }
  }

  async function handleScanCustomerPhone(phone: string) {
    try {
      const response = await fetch(
        `/api/pos/customers/search?q=${encodeURIComponent(phone)}`,
      );
      if (!response.ok) return;
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
      } else {
        setCustomer((previous) => ({ ...previous, phone }));
      }
    } catch (error) {
      console.error("POS scan customer failed:", error);
      setCustomer((previous) => ({ ...previous, phone }));
    }
  }

  const { lastAction, handleInput, handleKeyDown } = usePosScanner({
    products,
    onAddProduct: handleScannerAddProduct,
    onScanVoucher: handleScanVoucher,
    onScanCustomer: handleScanCustomerPhone,
  });

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

    addItem(
      buildPosCartItem(selectedProduct, customization.quantity, customization),
    );
    setSelectedProduct(null);
  }

  function handleHoldOrder() {
    holdOrder({ items, customer, voucher: selectedVoucher });
    resetCurrentSale();
  }

  function handleRestoreHeldOrder(order: Parameters<typeof restoreHeldOrder>[0]) {
    const restored = restoreHeldOrder(order);
    if (restored) {
      setItems(restored.items);
      setCustomer(restored.customer);
      setSelectedVoucher(restored.voucher);
      setVoucherCode(restored.voucher?.code ?? "");
    }
  }

  function handleSubmitOrder() {
    void payment.submitOrder(orderNote);
  }

  function openCustomerDisplay() {
    window.open("/admin/pos/customer-display", "bakery-pos-customer-display");
  }

  if (isLoading) {
    return <PosSkeleton />;
  }

  const showCartPanel = items.length > 0 || heldOrders.length > 0;

  return (
    <div
      className={
        showCartPanel
          ? "grid min-h-0 grid-cols-1 overflow-visible rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm xl:h-[calc(100vh-3rem)] xl:grid-cols-[minmax(0,1fr)_320px_340px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_340px_360px]"
          : "grid min-h-0 grid-cols-1 overflow-visible rounded-3xl border border-[#f0e1d2] bg-[#f5f0eb] shadow-sm xl:h-[calc(100vh-3rem)] xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_380px]"
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
        onScannerInput={(value) => handleInput(value, setSearchTerm)}
        onScannerKeyDown={(event) => handleKeyDown(event, searchTerm, setSearchTerm)}
      />

      {showCartPanel && (
        <aside className="flex min-h-0 flex-col border-t border-[#f0e1d2] bg-white xl:border-l xl:border-t-0">
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
          />
        </aside>
      )}

      <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-[#f0e1d2] bg-white xl:border-l xl:border-t-0">
        {payment.payosEnabled === false &&
          payment.paymentMethod === "bank_transfer" && (
            <div className="border-b border-[#f0e1d2] px-4 py-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                PayOS chưa được cấu hình. Chọn QR/CK sẽ không tạo được mã
                thanh toán.
              </div>
            </div>
          )}

        {lastAction && lastAction.type !== "unknown" && (
          <div className="border-b border-[#f0e1d2] px-4 py-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
              {lastAction.type === "product" && `Đã quét: ${lastAction.product.name}`}
              {lastAction.type === "voucher" && `Đã quét voucher: ${lastAction.code}`}
              {lastAction.type === "customer" && `Đã quét SĐT: ${lastAction.phone}`}
            </div>
          </div>
        )}

        {(payment.error || payment.message || isLoading) && (
          <div className="border-b border-[#f0e1d2] px-4 py-3">
            <div
              className={
                payment.error
                  ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
              }
            >
              {payment.error ||
                payment.message ||
                (isLoading ? "Đang tải POS..." : null)}
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
