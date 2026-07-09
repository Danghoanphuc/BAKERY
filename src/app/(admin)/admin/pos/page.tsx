"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "./_lib/pos-utils";

const HELD_ORDERS_STORAGE_KEY = "bakery-pos-held-orders";

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
  const [customer, setCustomer] = useState<PosCustomer>({ name: "", phone: "" });
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<SelectedVoucher>();
  const [paymentMethod, setPaymentMethod] =
    useState<PosPaymentMethod>("cash");
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedDisplay, setCompletedDisplay] =
    useState<Omit<PosDisplaySnapshot, "updatedAt"> | null>(null);

  useEffect(() => {
    loadCatalog();
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
      localStorage.setItem(
        HELD_ORDERS_STORAGE_KEY,
        JSON.stringify(heldOrders),
      );
    } catch (storageError) {
      console.error("Failed to save held POS orders:", storageError);
    }
  }, [heldOrders]);

  const voucherPricing = useMemo(
    () => calculateVoucherPricing(totalPrice, selectedVoucher),
    [selectedVoucher, totalPrice],
  );

  useEffect(() => {
    if (completedDisplay) {
      publishPosDisplaySnapshot(completedDisplay);
      return;
    }

    const discountAmount =
      selectedVoucher && voucherPricing.isEligible
        ? voucherPricing.discountAmount
        : 0;

    publishPosDisplaySnapshot({
      status: isSubmitting ? "awaiting_payment" : items.length > 0 ? "editing" : "idle",
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
    customer.name,
    customer.phone,
    isSubmitting,
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
        throw new Error("KhĂ´ng thá»ƒ táº£i dá»¯ liá»‡u POS.");
      }

      setProducts((await productsResponse.json()) as Product[]);
      setCategories((await categoriesResponse.json()) as Category[]);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load POS catalog:", loadError);
      setError("KhĂ´ng thá»ƒ táº£i dá»¯ liá»‡u POS.");
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
    clearCart();
    setCustomer({ name: "", phone: "" });
    setVoucherCode("");
    setSelectedVoucher(undefined);
    setPaymentMethod("cash");
  }

  function handleProductClick(product: Product) {
    setCompletedDisplay(null);
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
    if (items.length === 0 || isSubmitting) return;

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
        throw new Error("error" in data ? data.error : "KhĂ´ng thá»ƒ thanh toĂ¡n.");
      }

      const order = data as PosCheckoutResult;
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
      printReceipt(order);
      clearCart();
      setCustomer({ name: "", phone: "" });
      setVoucherCode("");
      setSelectedVoucher(undefined);
      setPaymentMethod("cash");
      await loadCatalog();
      window.setTimeout(() => {
        setCompletedDisplay(null);
      }, 9000);
      setMessage(`ÄĂ£ táº¡o Ä‘Æ¡n ${order.orderNumber}.`);
    } catch (submitError) {
      console.error("POS checkout failed:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "KhĂ´ng thá»ƒ thanh toĂ¡n.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        {(error || message || isLoading) && (
          <div className="border-b border-[#f0e1d2] px-4 py-3">
            <div
              className={
                error
                  ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
              }
            >
              {error || message || "Äang táº£i POS..."}
            </div>
          </div>
        )}

        <PosCheckoutPanel
          selectedVoucher={selectedVoucher}
          voucherPricing={voucherPricing}
          paymentMethod={paymentMethod}
          canSubmit={items.length > 0}
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
