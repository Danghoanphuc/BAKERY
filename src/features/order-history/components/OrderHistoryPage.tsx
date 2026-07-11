"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  Clock3,
  CreditCard,
  MapPin,
  ReceiptText,
  RefreshCw,
  RotateCw,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import type { Order } from "@/types/order";
import type { CartItem } from "@/types/cart";
import {
  filterHistoryOrders,
  getActionLabel,
  isActiveOrder,
  mapOrderToHistoryItem,
  type HistoryFilter,
  type OrderHistoryViewItem,
} from "../order-history-utils";

const filters: Array<{ id: HistoryFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang xử lý" },
  { id: "delivery", label: "Giao tận nơi" },
  { id: "pickup", label: "Đến lấy" },
  { id: "completed", label: "Hoàn tất" },
];

export default function OrderHistoryPage() {
  const addItem = useCartStore((state) => state.addItem);
  const [orders, setOrders] = useState<OrderHistoryViewItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryViewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredOrders = useMemo(
    () => filterHistoryOrders(orders, activeFilter, query),
    [activeFilter, orders, query],
  );
  const activeOrders = useMemo(
    () => orders.filter((order) => isActiveOrder(order.status)),
    [orders],
  );

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders");

      if (response.status === 401) {
        window.location.href = "/account/login?next=/order";
        return;
      }

      if (!response.ok) throw new Error("Không thể tải lịch sử đơn hàng.");

      const payload = (await response.json()) as Order[];
      const nextOrders = payload.map(mapOrderToHistoryItem);
      setOrders(nextOrders);

      const requestedOrderId = new URLSearchParams(window.location.search).get("orderId");
      if (requestedOrderId) {
        setSelectedOrder(nextOrders.find((order) => order.id === requestedOrderId) ?? null);
      }
    } catch (loadError) {
      console.error("Order history failed:", loadError);
      setError("Không thể tải lịch sử đơn hàng. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const buyAgain = (items: CartItem[]) => {
    items.forEach((item) => {
      addItem({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl,
        selectedSize: item.selectedSize,
        selectedFlavor: item.selectedFlavor,
        customMessage: item.customMessage,
        candles: item.candles,
      });
    });
    window.location.href = "/cart";
  };

  const runPrimaryAction = (order: OrderHistoryViewItem) => {
    if (order.action === "pay" && order.payosCheckoutUrl) {
      window.location.href = order.payosCheckoutUrl;
      return;
    }
    if (order.action === "buy-again") {
      buyAgain(order.items);
      return;
    }
    setSelectedOrder(order);
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#542413]">
      <div className="mx-auto min-h-screen w-full max-w-[520px] px-4 pb-28 pt-4">
        <header className="sticky top-0 z-30 -mx-4 bg-[#fffaf5]/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4ebe1] text-[#542413] active:scale-95"
                aria-label="Về trang chủ"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-black leading-tight">Lịch sử đơn hàng</h1>
                <p className="truncate text-xs font-semibold text-[#9b715b]">
                  {orders.length} đơn hàng của bạn
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOrders}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#7b6254] shadow-sm active:scale-95"
              aria-label="Làm mới"
            >
              <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
            </button>
          </div>

          <div className="mt-3 flex h-11 items-center gap-2 rounded-full border border-[#f0e3d3] bg-white px-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-[#9b715b]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã đơn, món, trạng thái..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#b58c78]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-7 w-7 place-items-center rounded-full bg-[#f7eee7]"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {activeOrders.length > 0 && (
          <section className="mt-3 rounded-[18px] border border-[#f0d8c2] bg-[#fff3df] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c35847] text-white">
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Bạn có {activeOrders.length} đơn đang xử lý</p>
                <p className="truncate text-xs font-semibold text-[#9b715b]">
                  Theo dõi trạng thái hoặc hoàn tất thanh toán còn dang dở.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={clsx(
                  "h-9 rounded-full border px-4 text-xs font-black transition",
                  activeFilter === filter.id
                    ? "border-[#542413] bg-[#542413] text-white"
                    : "border-[#eadbcc] bg-white text-[#7b6254]",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-4 space-y-3">
          {isLoading ? (
            <OrderSkeletonList />
          ) : error ? (
            <ErrorState message={error} onRetry={loadOrders} />
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onOpen={() => setSelectedOrder(order)}
                onPrimaryAction={() => runPrimaryAction(order)}
              />
            ))
          ) : (
            <EmptyState query={query} />
          )}
        </section>
      </div>

      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onBuyAgain={() => buyAgain(selectedOrder.items)}
          onPay={() => {
            if (selectedOrder.payosCheckoutUrl) {
              window.location.href = selectedOrder.payosCheckoutUrl;
            }
          }}
        />
      )}
    </main>
  );
}

function OrderCard({
  order,
  onOpen,
  onPrimaryAction,
}: {
  order: OrderHistoryViewItem;
  onOpen: () => void;
  onPrimaryAction: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[18px] border border-[#f0e3d3] bg-white shadow-[0_5px_16px_rgba(116,57,21,0.08)]">
      <button type="button" onClick={onOpen} className="block w-full p-3 text-left">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#f8ecdf] pb-3">
          <div>
            <p className="text-xs font-black text-[#542413]">#{order.orderNumber}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#9b715b]">{order.dateLabel}</p>
          </div>
          <StatusBadge order={order} />
        </div>

        <div className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#fdf2e3]">
            <Image src={order.imageUrl} alt={order.title} fill sizes="64px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-1 text-sm font-black text-[#542413]">{order.title}</h2>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#9b715b]">
              {order.fulfillmentLabel} · {order.itemCount} sản phẩm
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-base font-black text-[#c35847]">
                {formatPrice(order.totalAmount).replace(" ", "")}
              </span>
              {order.pointsEarned > 0 && order.status !== "cancelled" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3d2] px-2 py-1 text-[10px] font-black text-[#c4861a]">
                  <Sparkles className="h-3 w-3" />+{order.pointsEarned}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 border-t border-[#f8ecdf] px-3 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="h-9 flex-1 rounded-full border border-[#eadbcc] text-xs font-black text-[#65483a]"
        >
          Chi tiết
        </button>
        <button
          type="button"
          onClick={onPrimaryAction}
          className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[#c35847] text-xs font-black text-white"
        >
          {order.action === "buy-again" && <RotateCw className="h-3.5 w-3.5" />}
          {order.action === "pay" && <CreditCard className="h-3.5 w-3.5" />}
          {getActionLabel(order.action)}
        </button>
      </div>
    </article>
  );
}

function StatusBadge({ order }: { order: OrderHistoryViewItem }) {
  const toneClass = {
    success: "bg-[#f4f7e6] text-[#6d7036]",
    warning: "bg-[#fff3d2] text-[#b77713]",
    danger: "bg-[#fff0f0] text-[#c84a54]",
    muted: "bg-[#f4ebe1] text-[#7b6254]",
  }[order.statusTone];

  return (
    <span className={clsx("shrink-0 rounded-full px-3 py-1 text-[11px] font-black", toneClass)}>
      {order.statusLabel}
    </span>
  );
}

function OrderDetailSheet({
  order,
  onClose,
  onBuyAgain,
  onPay,
}: {
  order: OrderHistoryViewItem;
  onClose: () => void;
  onBuyAgain: () => void;
  onPay: () => void;
}) {
  const subtotal = order.productSubtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[120] bg-black/35">
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-[520px] overflow-y-auto rounded-t-[26px] bg-[#fffaf5] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#b38a76]">Chi tiết đơn</p>
            <h2 className="text-xl font-black text-[#542413]">#{order.orderNumber}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-[18px] border border-[#f0e3d3] bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#542413]">{order.statusLabel}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#9b715b]">{order.dateLabel}</p>
            </div>
            <StatusBadge order={order} />
          </div>
          <OrderProgress order={order} />
        </div>

        <section className="mt-4 rounded-[18px] border border-[#f0e3d3] bg-white p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#542413]">
            <ReceiptText className="h-4 w-4" />
            Món đã đặt
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.cartItemId} className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-[#fdf2e3]">
                  <Image src={item.imageUrl} alt={item.productName} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-black text-[#542413]">{item.productName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#9b715b]">
                    SL {item.quantity}
                    {item.selectedSize ? ` · Size ${item.selectedSize}` : ""}
                    {item.selectedFlavor ? ` · ${item.selectedFlavor}` : ""}
                  </p>
                  {item.customMessage && (
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#b38a76]">
                      “{item.customMessage}”
                    </p>
                  )}
                </div>
                <span className="text-sm font-black text-[#c35847]">
                  {formatPrice(item.price * item.quantity).replace(" ", "")}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[18px] border border-[#f0e3d3] bg-white p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#542413]">
            <MapPin className="h-4 w-4" />
            Nhận hàng
          </h3>
          <p className="text-sm font-bold text-[#542413]">{order.fulfillmentLabel}</p>
          <p className="mt-1 text-xs font-semibold text-[#9b715b]">
            {order.deliveryAddress || order.pickupTime || "Tiệm sẽ xác nhận thời gian nhận hàng."}
          </p>
        </section>

        <section className="mt-4 rounded-[18px] border border-[#f0e3d3] bg-white p-3">
          <div className="space-y-2 text-sm">
            <PriceRow label="Tạm tính" value={subtotal} />
            {Boolean(order.discountAmount) && (
              <PriceRow label={`Voucher${order.voucherCode ? ` ${order.voucherCode}` : ""}`} value={-(order.discountAmount ?? 0)} />
            )}
            {Boolean(order.deliveryFee) && <PriceRow label="Phí giao hàng" value={order.deliveryFee ?? 0} />}
            <div className="border-t border-[#f8ecdf] pt-2">
              <PriceRow label="Tổng cộng" value={order.totalAmount} isTotal />
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 bg-[#fffaf5]/95 px-4 pb-1 pt-3 backdrop-blur">
          {order.action === "pay" && (
            <button
              type="button"
              onClick={onPay}
              className="h-11 flex-1 rounded-full bg-[#c35847] text-sm font-black text-white"
            >
              Thanh toán tiếp
            </button>
          )}
          <button
            type="button"
            onClick={onBuyAgain}
            className="h-11 flex-1 rounded-full bg-[#542413] text-sm font-black text-white"
          >
            Mua lại
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderProgress({ order }: { order: OrderHistoryViewItem }) {
  const steps = ["Chờ xác nhận", "Đang chuẩn bị", order.orderType === "pickup" ? "Sẵn sàng" : "Đã giao"];
  const activeIndex =
    order.status === "cancelled"
      ? 0
      : order.status === "pending"
        ? 0
        : order.status === "confirmed" || order.status === "preparing" || order.status === "processing"
          ? 1
          : 2;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {steps.map((step, index) => (
        <div key={step} className="min-w-0">
          <div
            className={clsx(
              "h-1.5 rounded-full",
              index <= activeIndex && order.status !== "cancelled"
                ? "bg-[#c35847]"
                : "bg-[#eadbcc]",
            )}
          />
          <p className="mt-1 truncate text-[10px] font-bold text-[#9b715b]">{step}</p>
        </div>
      ))}
    </div>
  );
}

function PriceRow({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: number;
  isTotal?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={clsx("font-semibold text-[#9b715b]", isTotal && "text-[#542413] font-black")}>
        {label}
      </span>
      <span className={clsx("font-black", isTotal ? "text-[#c35847]" : "text-[#542413]")}>
        {value < 0 ? "-" : ""}
        {formatPrice(Math.abs(value)).replace(" ", "")}
      </span>
    </div>
  );
}

function OrderSkeletonList() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="rounded-[18px] border border-[#f0e3d3] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-[#f8ecdf] pb-3">
            <div className="h-4 w-28 animate-pulse rounded-full bg-[#f4ebe1]" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-[#f4ebe1]" />
          </div>
          <div className="flex gap-3">
            <div className="h-16 w-16 animate-pulse rounded-[14px] bg-[#f4ebe1]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#f4ebe1]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#f4ebe1]" />
              <div className="h-5 w-24 animate-pulse rounded bg-[#f4ebe1]" />
            </div>
          </div>
        </article>
      ))}
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#eadbcc] bg-white px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#fff3df] text-[#b84a39]">
        <ShoppingBag className="h-8 w-8" />
      </span>
      <h2 className="mt-4 text-lg font-black text-[#542413]">
        {query ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn hàng nào"}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#9b715b]">
        {query
          ? "Thử tìm theo mã đơn, tên món hoặc trạng thái khác."
          : "Khi bạn đặt bánh, lịch sử và trạng thái đơn sẽ xuất hiện tại đây."}
      </p>
      <Link
        href="/search"
        className="mt-5 rounded-full bg-[#c35847] px-5 py-3 text-sm font-black text-white"
      >
        Đặt món ngay
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[22px] border border-[#f0d8c2] bg-white px-5 py-10 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-[#c84a54]" />
      <h2 className="mt-3 text-base font-black text-[#542413]">Có lỗi xảy ra</h2>
      <p className="mt-2 text-sm font-semibold text-[#9b715b]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full bg-[#542413] px-5 py-3 text-sm font-black text-white"
      >
        Thử lại
      </button>
    </div>
  );
}
