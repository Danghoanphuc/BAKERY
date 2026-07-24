"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Send,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import type { CartItem, Product } from "@/types";
import type { PosTable, PosTableTab } from "@/types/pos-table";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { resolvePaymentQrImageSrc } from "@/lib/payment-qr";
import { generateCartItemId, getCartItemVariantDetails } from "@/types/cart";
import { PosProductCustomizerModal } from "../../_components/PosProductCustomizerModal";
import { usePosCatalog } from "../../_hooks/usePosCatalog";
import {
  buildPosCartItem,
  formatCurrency,
  isProductSellableToday,
  productNeedsCustomization,
  type PosCheckoutResult,
} from "../../_lib/pos-utils";

type View = "tables" | "order";
type PaymentState = {
  orderId: string;
  orderNumber: string;
  method: "cash" | "bank_transfer";
  status: "pending" | "paid";
  qrCode?: string;
  checkoutUrl?: string;
};

const STATUS_META: Record<
  PosTable["status"],
  { label: string; className: string; dot: string }
> = {
  available: {
    label: "Bàn trống",
    className: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    dot: "bg-emerald-500",
  },
  occupied: {
    label: "Đang phục vụ",
    className: "border-amber-200 bg-amber-50/80 text-amber-950",
    dot: "bg-amber-500",
  },
  payment_requested: {
    label: "Chờ thanh toán",
    className: "border-blue-200 bg-blue-50/80 text-blue-950",
    dot: "bg-blue-500",
  },
  paid: {
    label: "Đã thanh toán",
    className: "border-[#b7d7b2] bg-[#eff8ed] text-[#244d28]",
    dot: "bg-[#4f8f51]",
  },
  needs_cleaning: {
    label: "Chờ dọn bàn",
    className: "border-stone-200 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
  },
};

async function tableServiceRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/wholesale/pos/table-service", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Không thể cập nhật bàn.");
  return data;
}

function allTabItems(tab: PosTableTab) {
  return [...tab.rounds.flatMap((round) => round.items), ...tab.draftItems];
}

function mergeItem(items: CartItem[], item: CartItem) {
  const existing = items.find((candidate) => candidate.cartItemId === item.cartItemId);
  return existing
    ? items.map((candidate) =>
        candidate.cartItemId === item.cartItemId
          ? { ...candidate, quantity: candidate.quantity + item.quantity }
          : candidate,
      )
    : [...items, item];
}

function withCartItemId(item: Omit<CartItem, "cartItemId">): CartItem {
  return {
    ...item,
    cartItemId: generateCartItemId(
      item.productId,
      item.selectedSize,
      item.selectedFlavor,
      item.customMessage,
      item.candles,
      item.selectedSizeSku,
      item.selectedFlavorSku,
    ),
  };
}

export function TableServiceShell() {
  const [tables, setTables] = useState<PosTable[]>([]);
  const [activeTab, setActiveTab] = useState<PosTableTab>();
  const [view, setView] = useState<View>("tables");
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [showBill, setShowBill] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">(
    "bank_transfer",
  );
  const [cashReceived, setCashReceived] = useState(0);
  const [payment, setPayment] = useState<PaymentState>();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tabNote, setTabNote] = useState("");
  const [roundNote, setRoundNote] = useState("");
  const [customizingProduct, setCustomizingProduct] = useState<Product>();
  const paymentPollRef = useRef<number | undefined>(undefined);
  const { products, categories, isLoading: isLoadingCatalog, filterProducts } =
    usePosCatalog();

  const loadTables = useCallback(async (tableId?: string) => {
    const suffix = tableId ? `?tableId=${encodeURIComponent(tableId)}` : "";
    const response = await fetch(`/api/wholesale/pos/table-service${suffix}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as {
      tables?: PosTable[];
      activeTab?: PosTableTab;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Không thể tải danh sách bàn.");
    setTables(data.tables ?? []);
    if (tableId) setActiveTab(data.activeTab);
    return data;
  }, []);

  useEffect(() => {
    void loadTables()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Không thể tải bàn."))
      .finally(() => setIsLoadingTables(false));
  }, [loadTables]);

  useEffect(() => {
    if (view !== "tables") return;
    const timer = window.setInterval(() => void loadTables().catch(() => undefined), 10_000);
    return () => window.clearInterval(timer);
  }, [loadTables, view]);

  useEffect(() => {
    if (!activeTab) return;
    setCustomerName(activeTab.customerName ?? "");
    setCustomerPhone(activeTab.customerPhone ?? "");
    setTabNote(activeTab.note ?? "");
    if (activeTab.status === "payment_pending" && activeTab.paymentOrderId) {
      setPayment({
        orderId: activeTab.paymentOrderId,
        orderNumber: activeTab.paymentOrderNumber ?? "",
        method: "bank_transfer",
        status: "pending",
        qrCode: activeTab.paymentQrCode,
        checkoutUrl: activeTab.paymentCheckoutUrl,
      });
      setShowPayment(true);
    } else if (activeTab.status === "paid" && activeTab.paymentOrderId) {
      setPayment({
        orderId: activeTab.paymentOrderId,
        orderNumber: activeTab.paymentOrderNumber ?? "",
        method: activeTab.paymentMethod ?? "cash",
        status: "paid",
      });
      setShowPayment(true);
    }
  }, [activeTab]);

  const filteredProducts = useMemo(
    () => filterProducts(products, searchTerm, selectedCategory),
    [filterProducts, products, searchTerm, selectedCategory],
  );
  const selectedTable = activeTab
    ? tables.find((table) => table.id === activeTab.tableId)
    : undefined;
  const sentItems = activeTab?.rounds.flatMap((round) => round.items) ?? [];
  const draftItems = activeTab?.draftItems ?? [];
  const draftTotal = draftItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const draftQuantity = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  async function enterTable(table: PosTable) {
    if (isWorking) return;
    setIsWorking(true);
    try {
      if (table.status === "needs_cleaning") {
        await tableServiceRequest({ action: "release_table", tableId: table.id });
        await loadTables();
        toast.success(`${table.name} đã sẵn sàng đón khách.`);
        return;
      }

      let tab: PosTableTab | undefined;
      if (table.currentTabId) {
        tab = (await loadTables(table.id)).activeTab;
      } else {
        const data = await tableServiceRequest<{ tab: PosTableTab }>({
          action: "open_table",
          tableId: table.id,
        });
        tab = data.tab;
        await loadTables();
      }
      if (!tab) throw new Error("Không tìm thấy hóa đơn của bàn.");
      setActiveTab(tab);
      setView("order");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở bàn.");
    } finally {
      setIsWorking(false);
    }
  }

  async function leaveTable() {
    if (!activeTab || isWorking) return;
    setIsWorking(true);
    try {
      if (activeTab.status === "open" && activeTab.totalQuantity === 0) {
        await tableServiceRequest({
          action: "abandon_empty_table",
          tabId: activeTab.id,
        });
      }
      setView("tables");
      setActiveTab(undefined);
      setShowBill(false);
      await loadTables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể rời bàn.");
    } finally {
      setIsWorking(false);
    }
  }

  async function persistDraft(nextItems: CartItem[]) {
    if (!activeTab || isWorking) return;
    setActiveTab({ ...activeTab, draftItems: nextItems });
    setIsWorking(true);
    try {
      const data = await tableServiceRequest<{ tab: PosTableTab }>({
        action: "save_draft",
        tabId: activeTab.id,
        items: nextItems,
        customerName,
        customerPhone,
        note: tabNote,
      });
      setActiveTab(data.tab);
    } catch (error) {
      await loadTables(activeTab.tableId);
      toast.error(error instanceof Error ? error.message : "Không thể lưu món.");
    } finally {
      setIsWorking(false);
    }
  }

  function addProduct(product: Product) {
    if (!activeTab || !isProductSellableToday(product) || isWorking) return;
    if (productNeedsCustomization(product)) {
      setCustomizingProduct(product);
      return;
    }
    const item = withCartItemId(buildPosCartItem(product));
    void persistDraft(mergeItem(activeTab.draftItems, item));
  }

  function addCustomizedProduct(customization: {
    quantity: number;
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  }) {
    if (!activeTab || !customizingProduct) return;
    const item = withCartItemId(
      buildPosCartItem(
        customizingProduct,
        customization.quantity,
        customization,
      ),
    );
    setCustomizingProduct(undefined);
    void persistDraft(mergeItem(activeTab.draftItems, item));
  }

  function updateDraftQuantity(cartItemId: string, quantity: number) {
    if (!activeTab) return;
    const next =
      quantity <= 0
        ? activeTab.draftItems.filter((item) => item.cartItemId !== cartItemId)
        : activeTab.draftItems.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item,
          );
    void persistDraft(next);
  }

  async function saveGuestDetails() {
    if (!activeTab) return;
    await persistDraft(activeTab.draftItems);
    toast.success("Đã lưu thông tin hóa đơn.");
  }

  async function sendRound() {
    if (!activeTab || !activeTab.draftItems.length || isWorking) return;
    setIsWorking(true);
    try {
      const data = await tableServiceRequest<{ tab: PosTableTab }>({
        action: "send_round",
        tabId: activeTab.id,
        note: roundNote,
      });
      setActiveTab(data.tab);
      setRoundNote("");
      setShowBill(false);
      toast.success(`Đã gửi lượt ${data.tab.rounds.length} tới bếp.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi món.");
    } finally {
      setIsWorking(false);
    }
  }

  async function beginPayment() {
    if (!activeTab || !sentItems.length || activeTab.draftItems.length || isWorking) return;
    const items = allTabItems(activeTab);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (paymentMethod === "cash" && cashReceived < total) {
      toast.error("Số tiền khách đưa chưa đủ.");
      return;
    }

    setIsWorking(true);
    try {
      const response = await fetch("/api/wholesale/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.replace(/\s+/g, "").trim(),
          items,
          paymentMethod,
          cashReceived: paymentMethod === "cash" ? cashReceived : undefined,
          note: [`Dùng tại chỗ · ${activeTab.tableName}`, tabNote.trim()]
            .filter(Boolean)
            .join(" · "),
          posServiceType: "table",
          tableId: activeTab.tableId,
          tableName: activeTab.tableName,
        }),
      });
      const data = (await response.json()) as PosCheckoutResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể tạo thanh toán.");

      const nextPayment: PaymentState = {
        orderId: data.id,
        orderNumber: data.orderNumber,
        method: paymentMethod,
        status: data.paymentStatus === "paid" ? "paid" : "pending",
        qrCode: data.payos?.qrCode,
        checkoutUrl: data.payos?.checkoutUrl,
      };
      await tableServiceRequest({
        action: "attach_payment",
        tabId: activeTab.id,
        orderId: nextPayment.orderId,
        orderNumber: nextPayment.orderNumber,
        method: nextPayment.method,
        status: nextPayment.status,
        qrCode: nextPayment.qrCode,
        checkoutUrl: nextPayment.checkoutUrl,
      });
      setPayment(nextPayment);
      setShowPayment(true);
      setShowBill(false);
      await loadTables(activeTab.tableId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thanh toán.");
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    if (!payment || payment.status !== "pending" || !activeTab) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/wholesale/pos/checkout/${payment.orderId}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          paymentStatus?: string;
          status?: string;
        };
        if (!response.ok) throw new Error("Không thể kiểm tra thanh toán.");
        if (data.paymentStatus === "paid" || data.status === "completed") {
          await tableServiceRequest({
            action: "confirm_payment",
            tabId: activeTab.id,
          });
          if (!cancelled) {
            setPayment((current) => (current ? { ...current, status: "paid" } : current));
            await loadTables(activeTab.tableId);
          }
          return;
        }
      } catch {
        // A transient polling error should not interrupt the customer's payment.
      }
      if (!cancelled) paymentPollRef.current = window.setTimeout(poll, 1600);
    };
    paymentPollRef.current = window.setTimeout(poll, 800);
    return () => {
      cancelled = true;
      if (paymentPollRef.current) window.clearTimeout(paymentPollRef.current);
    };
  }, [activeTab, loadTables, payment]);

  function printReceipt() {
    if (!activeTab || !payment) return;
    const items = allTabItems(activeTab);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const lines = [
      "BAKERY POS",
      `${activeTab.tableName} · Đơn ${payment.orderNumber}`,
      `Nhân viên: ${activeTab.openedByName}`,
      customerName.trim() ? `Khách: ${customerName.trim()}` : "",
      "--------------------------------",
      ...items.map(
        (item) =>
          `${item.productName} x${item.quantity}  ${formatCurrency(item.price * item.quantity)}`,
      ),
      "--------------------------------",
      `TỔNG TIỀN: ${formatCurrency(total)}`,
      `Thanh toán: ${payment.method === "cash" ? "Tiền mặt" : "QR / Chuyển khoản"}`,
      "Cảm ơn quý khách!",
    ].filter(Boolean);
    const printWindow = window.open("", "_blank", "width=420,height=680");
    if (!printWindow) {
      toast.error("Trình duyệt đang chặn cửa sổ in.");
      return;
    }
    printWindow.document.title = `Hóa đơn ${payment.orderNumber}`;
    const receipt = printWindow.document.createElement("pre");
    receipt.style.cssText =
      "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;white-space:pre-wrap;padding:16px";
    receipt.textContent = lines.join("\n");
    printWindow.document.body.replaceChildren(receipt);
    printWindow.focus();
    printWindow.print();
  }

  async function printAndCloseTable() {
    if (!activeTab || !payment || payment.status !== "paid" || isWorking) return;
    printReceipt();
    setIsWorking(true);
    try {
      await tableServiceRequest({ action: "close_table", tabId: activeTab.id });
      setShowPayment(false);
      setPayment(undefined);
      setActiveTab(undefined);
      setView("tables");
      await loadTables();
      toast.success("Đã đóng hóa đơn. Bàn đang chờ dọn.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đóng bàn.");
    } finally {
      setIsWorking(false);
    }
  }

  async function cancelPendingPayment() {
    if (!activeTab || !payment || payment.status !== "pending" || isWorking) return;
    setIsWorking(true);
    try {
      const cancelResponse = await fetch(`/api/wholesale/pos/checkout/${payment.orderId}/cancel`, {
        method: "POST",
      });
      const cancelData = (await cancelResponse.json()) as { error?: string };
      if (!cancelResponse.ok) {
        throw new Error(cancelData.error || "Không thể hủy mã QR.");
      }
      await tableServiceRequest({
        action: "reopen_payment",
        tabId: activeTab.id,
      });
      setPayment(undefined);
      setShowPayment(false);
      await loadTables(activeTab.tableId);
      toast.success("Đã hủy QR. Bạn có thể sửa hóa đơn hoặc tạo mã mới.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể hủy thanh toán.");
    } finally {
      setIsWorking(false);
    }
  }

  if (view === "tables") {
    return (
      <TableList
        tables={tables}
        isLoading={isLoadingTables}
        isWorking={isWorking}
        onSelect={enterTable}
      />
    );
  }

  if (!activeTab) return null;

  return (
    <div className="relative mx-auto flex min-h-full max-w-5xl flex-col bg-[#f7f4ef] text-[#30241e] sm:min-h-[calc(100vh-3rem)] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-[#eadfd5] sm:shadow-sm">
      <header className="sticky top-0 z-20 border-b border-[#eadfd5] bg-[#fffdf9]/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leaveTable()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#e6d9ce] bg-white text-[#65483a]"
            aria-label="Quay lại danh sách bàn"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-black">{activeTab.tableName}</h1>
              <span className="rounded-full bg-[#f3e8df] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#8b5545]">
                {activeTab.status === "open" ? "Đang phục vụ" : STATUS_META[selectedTable?.status ?? "occupied"].label}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#806e64]">
              <Clock3 className="h-3.5 w-3.5" />
              Mở lúc {formatTime(activeTab.openedAt)} · {activeTab.openedByName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBill(true)}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#294d35] text-white shadow-sm"
            aria-label="Xem hóa đơn"
          >
            <ReceiptText className="h-5 w-5" />
            {activeTab.totalQuantity > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d8583f] px-1 text-[10px] font-black">
                {activeTab.totalQuantity}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="border-b border-[#eadfd5] bg-white px-3 py-3 sm:px-5">
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-[#e5d8cd] bg-[#faf7f3] px-3 focus-within:border-[#b84a39]">
          <Search className="h-4 w-4 shrink-0 text-[#9a8172]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm món..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#ad9b90]"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm("")} aria-label="Xóa tìm kiếm">
              <X className="h-4 w-4 text-[#9a8172]" />
            </button>
          )}
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip
            active={selectedCategory === "all"}
            label="Tất cả"
            onClick={() => setSelectedCategory("all")}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={selectedCategory === category.id}
              label={category.name}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-3 pb-28 pt-3 sm:px-5">
        {isLoadingCatalog ? (
          <div className="grid min-h-64 place-items-center text-[#8b7568]">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#dacbc0] bg-white text-sm font-bold text-[#907d72]">
            Không có món phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const sellable = isProductSellableToday(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={!sellable || isWorking || activeTab.status !== "open"}
                  onClick={() => addProduct(product)}
                  className="group overflow-hidden rounded-2xl border border-[#e7dbd0] bg-white text-left shadow-sm transition active:scale-[0.98] disabled:opacity-45"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#f4ece5]">
                    <ProductImage src={product.imageUrl} alt={product.name} />
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#3b2a22]">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#ad4938]">
                        {formatCurrency(product.price)}
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f2e4da] text-[#a94938] transition group-active:bg-[#a94938] group-active:text-white">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e5d8cd] bg-white/96 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:absolute sm:rounded-b-3xl">
        <div className="mx-auto flex max-w-5xl gap-2">
          <button
            type="button"
            onClick={() => setShowBill(true)}
            className="flex h-14 flex-1 items-center justify-between rounded-2xl border border-[#dfd2c7] bg-[#faf7f3] px-4 text-left"
          >
            <span>
              <span className="block text-xs font-bold text-[#887369]">
                {draftQuantity > 0 ? `${draftQuantity} món mới` : `${activeTab.totalQuantity} món trong đơn`}
              </span>
              <span className="mt-0.5 block text-base font-black">
                {formatCurrency(draftQuantity > 0 ? draftTotal : activeTab.subtotal)}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#8c776b]" />
          </button>
          {draftQuantity > 0 && activeTab.status === "open" ? (
            <button
              type="button"
              disabled={isWorking}
              onClick={() => setShowBill(true)}
              className="flex h-14 min-w-32 items-center justify-center gap-2 rounded-2xl bg-[#a94736] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(169,71,54,0.25)] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Gửi bếp
            </button>
          ) : (
            <button
              type="button"
              disabled={!sentItems.length || activeTab.status !== "open"}
              onClick={() => setShowBill(true)}
              className="flex h-14 min-w-32 items-center justify-center gap-2 rounded-2xl bg-[#294d35] px-4 text-sm font-black text-white disabled:opacity-45"
            >
              <CreditCard className="h-4 w-4" />
              Tính tiền
            </button>
          )}
        </div>
      </div>

      {showBill && (
        <BillSheet
          tab={activeTab}
          customerName={customerName}
          customerPhone={customerPhone}
          tabNote={tabNote}
          roundNote={roundNote}
          isWorking={isWorking}
          paymentMethod={paymentMethod}
          cashReceived={cashReceived}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          onTabNoteChange={setTabNote}
          onRoundNoteChange={setRoundNote}
          onPaymentMethodChange={setPaymentMethod}
          onCashReceivedChange={setCashReceived}
          onUpdateDraftQuantity={updateDraftQuantity}
          onSaveDetails={() => void saveGuestDetails()}
          onSendRound={() => void sendRound()}
          onPay={() => void beginPayment()}
          onClose={() => setShowBill(false)}
        />
      )}

      {showPayment && payment && (
        <PaymentSheet
          tab={activeTab}
          payment={payment}
          isWorking={isWorking}
          onPrintAgain={printReceipt}
          onComplete={() => void printAndCloseTable()}
          onCancel={() => void cancelPendingPayment()}
          onClose={() => {
            if (payment.status === "paid") return;
            setShowPayment(false);
          }}
        />
      )}

      {customizingProduct && (
        <PosProductCustomizerModal
          product={customizingProduct}
          isOpen
          onClose={() => setCustomizingProduct(undefined)}
          onAdd={addCustomizedProduct}
        />
      )}
    </div>
  );
}

function TableList({
  tables,
  isLoading,
  isWorking,
  onSelect,
}: {
  tables: PosTable[];
  isLoading: boolean;
  isWorking: boolean;
  onSelect: (table: PosTable) => void;
}) {
  const areas = [...new Set(tables.map((table) => table.area))];
  const occupiedCount = tables.filter((table) => table.status !== "available").length;

  return (
    <div className="mx-auto min-h-full max-w-5xl bg-[#f7f4ef] text-[#30241e] sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-[#eadfd5] sm:shadow-sm">
      <header className="border-b border-[#eadfd5] bg-[#fffdf9] px-4 py-4 sm:rounded-t-3xl sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a94b3a]">
              POS phục vụ bàn
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Chọn bàn để bắt đầu</h1>
            <p className="mt-1 text-sm font-semibold text-[#806e64]">
              {occupiedCount} bàn đang hoạt động · {tables.length - occupiedCount} bàn trống
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/wholesale/pos/kitchen"
              className="flex h-11 items-center gap-2 rounded-2xl border border-[#dfd2c7] bg-white px-3 text-xs font-black text-[#604b40]"
              aria-label="Màn hình bếp"
            >
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Màn hình bếp</span>
            </Link>
            <Link
              href="/wholesale/pos"
              className="flex h-11 items-center gap-2 rounded-2xl border border-[#dfd2c7] bg-white px-3 text-xs font-black text-[#604b40]"
              aria-label="Bán tại quầy"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Bán tại quầy</span>
            </Link>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.entries(STATUS_META).map(([status, meta]) => {
            const count = tables.filter((table) => table.status === status).length;
            if (!count) return null;
            return (
              <span
                key={status}
                className="flex shrink-0 items-center gap-2 rounded-full border border-[#e8ddd4] bg-white px-3 py-2 text-xs font-bold text-[#6f5c52]"
              >
                <span className={clsx("h-2 w-2 rounded-full", meta.dot)} />
                {meta.label} · {count}
              </span>
            );
          })}
        </div>
      </header>

      <main className="space-y-6 px-4 py-5 sm:px-6">
        {isLoading ? (
          <div className="grid min-h-80 place-items-center text-[#8b7568]">
            <LoaderCircle className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          areas.map((area) => (
            <section key={area}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#6c584e]">
                  {area}
                </h2>
                <span className="text-xs font-bold text-[#9b8a80]">
                  {tables.filter((table) => table.area === area).length} bàn
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tables
                  .filter((table) => table.area === area)
                  .map((table) => {
                    const meta = STATUS_META[table.status];
                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={isWorking}
                        onClick={() => onSelect(table)}
                        className={clsx(
                          "min-h-36 rounded-3xl border p-4 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60",
                          meta.className,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/75 shadow-sm">
                            {table.status === "needs_cleaning" ? (
                              <Sparkles className="h-5 w-5" />
                            ) : (
                              <Users className="h-5 w-5" />
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black">
                            <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-black">{table.name}</h3>
                        <p className="mt-1 text-xs font-bold opacity-70">
                          {table.status === "available"
                            ? `${table.capacity} chỗ · Chạm để mở`
                            : table.status === "needs_cleaning"
                              ? "Chạm khi đã dọn xong"
                              : `${table.assignedStaffName ?? "Nhân viên"} · ${table.openedAt ? formatElapsed(table.openedAt) : "Vừa mở"}`}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function BillSheet({
  tab,
  customerName,
  customerPhone,
  tabNote,
  roundNote,
  isWorking,
  paymentMethod,
  cashReceived,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onTabNoteChange,
  onRoundNoteChange,
  onPaymentMethodChange,
  onCashReceivedChange,
  onUpdateDraftQuantity,
  onSaveDetails,
  onSendRound,
  onPay,
  onClose,
}: {
  tab: PosTableTab;
  customerName: string;
  customerPhone: string;
  tabNote: string;
  roundNote: string;
  isWorking: boolean;
  paymentMethod: "cash" | "bank_transfer";
  cashReceived: number;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onTabNoteChange: (value: string) => void;
  onRoundNoteChange: (value: string) => void;
  onPaymentMethodChange: (value: "cash" | "bank_transfer") => void;
  onCashReceivedChange: (value: number) => void;
  onUpdateDraftQuantity: (id: string, quantity: number) => void;
  onSaveDetails: () => void;
  onSendRound: () => void;
  onPay: () => void;
  onClose: () => void;
}) {
  const hasDraft = tab.draftItems.length > 0;
  const sentItems = tab.rounds.flatMap((round) => round.items);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/45 sm:absolute sm:items-center sm:justify-center sm:rounded-3xl sm:p-5">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-[#eadfd5] px-4 py-4">
          <div>
            <h2 className="text-lg font-black">Hóa đơn {tab.tableName}</h2>
            <p className="mt-0.5 text-xs font-bold text-[#8a756a]">
              {tab.totalQuantity} món · {formatCurrency(tab.subtotal)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#f3ece6]"
            aria-label="Đóng hóa đơn"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {tab.rounds.map((round) => (
            <section key={round.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wide text-[#6c594f]">
                  Lượt {round.number} · Đã gửi bếp
                </h3>
                <span className="text-[11px] font-bold text-[#9b897f]">
                  {formatTime(round.sentAt)}
                </span>
              </div>
              <div className="divide-y divide-[#eee4dc] rounded-2xl border border-[#e8ddd4] bg-white px-3">
                {round.items.map((item) => (
                  <BillItem key={`${round.id}-${item.cartItemId}`} item={item} />
                ))}
              </div>
            </section>
          ))}

          {hasDraft && (
            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-[#a44938]">
                Món mới · Chưa gửi bếp
              </h3>
              <div className="divide-y divide-[#f0ddd7] rounded-2xl border border-[#e8bdb2] bg-[#fff7f4] px-3">
                {tab.draftItems.map((item, index) => (
                  <BillItem
                    key={`${item.cartItemId}-${index}`}
                    item={item}
                    editable
                    disabled={isWorking}
                    onQuantityChange={(quantity) =>
                      onUpdateDraftQuantity(item.cartItemId, quantity)
                    }
                  />
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-black text-[#6c594f]">
                  Ghi chú cho lượt này
                </span>
                <input
                  value={roundNote}
                  onChange={(event) => onRoundNoteChange(event.target.value)}
                  placeholder="Ví dụ: ra nước trước, ít đá..."
                  className="h-11 w-full rounded-2xl border border-[#e6d8ce] bg-white px-3 text-sm font-semibold outline-none focus:border-[#aa4938]"
                />
              </label>
            </section>
          )}

          <details className="rounded-2xl border border-[#e8ddd4] bg-white p-3">
            <summary className="cursor-pointer text-sm font-black text-[#5f4b41]">
              Khách hàng & ghi chú chung
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder="Tên khách (không bắt buộc)"
                className="h-11 rounded-xl border border-[#e6d8ce] px-3 text-sm font-semibold outline-none focus:border-[#aa4938]"
              />
              <input
                value={customerPhone}
                onChange={(event) => onCustomerPhoneChange(event.target.value)}
                inputMode="tel"
                placeholder="Số điện thoại"
                className="h-11 rounded-xl border border-[#e6d8ce] px-3 text-sm font-semibold outline-none focus:border-[#aa4938]"
              />
              <input
                value={tabNote}
                onChange={(event) => onTabNoteChange(event.target.value)}
                placeholder="Ghi chú chung của bàn"
                className="h-11 rounded-xl border border-[#e6d8ce] px-3 text-sm font-semibold outline-none focus:border-[#aa4938] sm:col-span-2"
              />
              <button
                type="button"
                disabled={isWorking}
                onClick={onSaveDetails}
                className="h-10 rounded-xl bg-[#f0e7df] text-xs font-black text-[#634e43] sm:col-span-2"
              >
                Lưu thông tin
              </button>
            </div>
          </details>

          {!hasDraft && sentItems.length > 0 && tab.status === "open" && (
            <section className="rounded-3xl border border-[#d8e2d6] bg-[#f2f7f0] p-4">
              <h3 className="text-sm font-black text-[#294d35]">Khách yêu cầu tính tiền</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#637466]">
                Chọn phương thức rồi đưa QR cho khách quét, hoặc nhập tiền mặt đã nhận.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PaymentMethodButton
                  active={paymentMethod === "bank_transfer"}
                  icon={<CreditCard className="h-4 w-4" />}
                  label="QR / Chuyển khoản"
                  onClick={() => onPaymentMethodChange("bank_transfer")}
                />
                <PaymentMethodButton
                  active={paymentMethod === "cash"}
                  icon={<Banknote className="h-4 w-4" />}
                  label="Tiền mặt"
                  onClick={() => onPaymentMethodChange("cash")}
                />
              </div>
              {paymentMethod === "cash" && (
                <div className="mt-3">
                  <label className="text-xs font-black text-[#4d6351]">Khách đưa</label>
                  <input
                    value={cashReceived || ""}
                    onChange={(event) => onCashReceivedChange(Number(event.target.value) || 0)}
                    type="number"
                    inputMode="numeric"
                    placeholder={String(tab.subtotal)}
                    className="mt-1 h-12 w-full rounded-2xl border border-[#ccdaca] bg-white px-3 text-base font-black outline-none focus:border-[#4f7a57]"
                  />
                  <p className="mt-2 text-xs font-bold text-[#607263]">
                    Tiền thừa: {formatCurrency(Math.max(0, cashReceived - tab.subtotal))}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="border-t border-[#eadfd5] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#78655a]">Tổng hóa đơn</span>
            <span className="text-xl font-black text-[#30241e]">{formatCurrency(tab.subtotal)}</span>
          </div>
          {hasDraft ? (
            <button
              type="button"
              disabled={isWorking}
              onClick={onSendRound}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#a94736] text-sm font-black text-white shadow-[0_8px_20px_rgba(169,71,54,0.22)] disabled:opacity-60"
            >
              {isWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi {tab.draftItems.reduce((sum, item) => sum + item.quantity, 0)} món tới bếp
            </button>
          ) : sentItems.length > 0 && tab.status === "open" ? (
            <button
              type="button"
              disabled={isWorking}
              onClick={onPay}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#294d35] text-sm font-black text-white shadow-[0_8px_20px_rgba(41,77,53,0.2)] disabled:opacity-60"
            >
              {isWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {paymentMethod === "bank_transfer" ? "Tạo QR thanh toán" : "Xác nhận nhận tiền"}
            </button>
          ) : (
            <p className="rounded-2xl bg-[#f5efea] px-3 py-3 text-center text-xs font-bold text-[#826e63]">
              Chọn món để bắt đầu lượt gọi món mới.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function PaymentSheet({
  tab,
  payment,
  isWorking,
  onPrintAgain,
  onComplete,
  onCancel,
  onClose,
}: {
  tab: PosTableTab;
  payment: PaymentState;
  isWorking: boolean;
  onPrintAgain: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const qrImage = resolvePaymentQrImageSrc({
    qrCode: payment.qrCode,
    checkoutUrl: payment.checkoutUrl,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#17251d]/70 sm:absolute sm:items-center sm:justify-center sm:rounded-3xl sm:p-5">
      <div className="w-full overflow-hidden rounded-t-[30px] bg-[#fffdf9] shadow-2xl sm:max-w-md sm:rounded-[30px]">
        {payment.status === "pending" ? (
          <>
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9f4b3b]">
                  {tab.tableName}
                </p>
                <h2 className="mt-1 text-xl font-black">Đưa màn hình này cho khách</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-[#f1e9e2]"
                aria-label="Thu nhỏ thanh toán"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 pb-5 pt-4 text-center">
              <div className="mx-auto w-fit rounded-[28px] border border-[#e3d5c9] bg-white p-4 shadow-[0_18px_45px_rgba(68,42,28,0.12)]">
                {qrImage ? (
                  <img src={qrImage} alt="QR thanh toán" className="h-64 w-64 max-w-full" />
                ) : (
                  <div className="grid h-64 w-64 max-w-full place-items-center text-sm font-bold text-red-700">
                    Không tải được mã QR
                  </div>
                )}
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-[#294d35]">
                {formatCurrency(tab.subtotal)}
              </p>
              <p className="mt-1 text-sm font-bold text-[#806e64]">
                Đơn {payment.orderNumber}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#f2f6f0] px-3 py-3 text-sm font-black text-[#3e6547]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Đang chờ ngân hàng xác nhận
              </div>
              <button
                type="button"
                disabled={isWorking}
                onClick={onCancel}
                className="mt-2 h-11 w-full rounded-2xl text-xs font-black text-[#8b4b3e] disabled:opacity-50"
              >
                Hủy QR để sửa hóa đơn
              </button>
            </div>
          </>
        ) : (
          <div className="px-5 py-7 text-center pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e9f5e6] text-[#43804a] ring-8 ring-[#f3faf1]">
              <Check className="h-10 w-10 stroke-[3]" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#4d8252]">
              Đã nhận thanh toán
            </p>
            <h2 className="mt-2 text-2xl font-black">Hoàn tất {tab.tableName}</h2>
            <p className="mt-2 text-sm font-semibold text-[#7f6c62]">
              Đơn {payment.orderNumber} · {formatCurrency(tab.subtotal)}
            </p>
            <button
              type="button"
              disabled={isWorking}
              onClick={onComplete}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#294d35] text-sm font-black text-white shadow-[0_10px_24px_rgba(41,77,53,0.24)] disabled:opacity-60"
            >
              {isWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              In bill & kết thúc bàn
            </button>
            <button
              type="button"
              onClick={onPrintAgain}
              className="mt-2 h-11 w-full rounded-2xl text-xs font-black text-[#6e5a50]"
            >
              In riêng, chưa đóng bàn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BillItem({
  item,
  editable,
  disabled,
  onQuantityChange,
}: {
  item: CartItem;
  editable?: boolean;
  disabled?: boolean;
  onQuantityChange?: (quantity: number) => void;
}) {
  const details = getCartItemVariantDetails(item);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#3b2b23]">{item.productName}</p>
        {details.length > 0 && (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#907d72]">
            {details.join(" · ")}
          </p>
        )}
        <p className="mt-1 text-xs font-bold text-[#a44b3a]">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
      {editable ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onQuantityChange?.(item.quantity - 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#e1d2c7] bg-white disabled:opacity-50"
            aria-label={`Giảm ${item.productName}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-sm font-black">{item.quantity}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onQuantityChange?.(item.quantity + 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#e1d2c7] bg-white disabled:opacity-50"
            aria-label={`Tăng ${item.productName}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <span className="rounded-full bg-[#f2ece7] px-2 py-1 text-xs font-black text-[#654f44]">
          ×{item.quantity}
        </span>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-9 shrink-0 rounded-full border px-3 text-xs font-black transition",
        active
          ? "border-[#a94736] bg-[#a94736] text-white"
          : "border-[#e3d6cc] bg-white text-[#6f5a50]",
      )}
    >
      {label}
    </button>
  );
}

function PaymentMethodButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-black",
        active
          ? "border-[#4d7554] bg-[#e7f1e5] text-[#294d35]"
          : "border-[#dce5da] bg-white text-[#6c796d]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatElapsed(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Vừa mở";
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)}g ${minutes % 60}p`;
}
