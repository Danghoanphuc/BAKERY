"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, MapPin, PackageCheck, ReceiptText, RefreshCcw, ShoppingBag } from "lucide-react";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { getCartItemVariantDetails, type CartItem } from "@/types/cart";
import { formatPrice } from "@/lib/utils";

type OrderDetail = {
  id: string;
  orderNumber: string;
  items: CartItem[];
  totalAmount: number;
  productSubtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  orderType: "delivery" | "pickup" | "preorder";
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  pickupTime?: string;
  notes?: string;
  loyaltyPointsEarned?: number;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending: "Đang chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  processing: "Đang xử lý",
  ready: "Sẵn sàng nhận",
  completed: "Hoàn tất",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default function CustomerOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOrder() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace(`/account/login?next=${encodeURIComponent(`/order/${orderId}`)}`);
        return;
      }
      if (!response.ok) throw new Error(response.status === 404 ? "Không tìm thấy đơn hàng." : "Không thể tải chi tiết đơn hàng.");
      setOrder(await response.json() as OrderDetail);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrder(); }, [orderId]);

  if (loading) return <main className="brand-page grid min-h-screen place-items-center"><div className="flex items-center gap-2 text-sm font-black text-navy"><Loader2 className="h-5 w-5 animate-spin text-teal" /> Đang tải đơn hàng...</div></main>;

  if (error || !order) return <main className="brand-page grid min-h-screen place-items-center px-4"><section className="brand-card w-full max-w-md p-6 text-center"><ReceiptText className="mx-auto h-10 w-10 text-brand-500" /><h1 className="brand-heading mt-4 text-xl">Chưa mở được đơn hàng</h1><p className="mt-2 text-sm text-text-muted">{error}</p><button type="button" onClick={() => void loadOrder()} className="brand-button-primary mt-5 w-full"><RefreshCcw className="h-4 w-4" /> Thử lại</button></section></main>;

  const paid = order.paymentStatus === "paid";
  const subtotal = order.productSubtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return <main className="brand-page min-h-screen px-4 py-5 sm:py-8">
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/order")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm" aria-label="Quay lại danh sách đơn"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0"><p className="brand-eyebrow">Chi tiết đơn hàng</p><h1 className="brand-heading truncate text-xl sm:text-2xl">#{order.orderNumber}</h1></div>
      </header>

      <section className="brand-card overflow-hidden">
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${paid ? "bg-teal-soft" : "bg-[#fff7ed]"}`}>
          <div className="flex items-center gap-3">{paid ? <CheckCircle2 className="h-6 w-6 text-teal" /> : <Clock3 className="h-6 w-6 text-[#b7791f]" />}<div><p className="text-xs font-black uppercase tracking-[0.08em] text-text-muted">Thanh toán</p><p className="mt-0.5 font-black text-navy">{paid ? "Đã thanh toán" : "Chờ thanh toán"}</p></div></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-navy shadow-sm">{statusLabels[order.status] ?? order.status}</span>
        </div>
        <div className="grid gap-3 border-t border-sand/70 p-5 text-sm sm:grid-cols-2">
          <Info icon={ShoppingBag} label="Hình thức" value={order.orderType === "delivery" ? "Giao tận nơi" : order.orderType === "pickup" ? "Nhận tại tiệm" : "Đặt trước"} />
          <Info icon={PackageCheck} label="Ngày đặt" value={new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(order.createdAt))} />
          {(order.deliveryAddress || order.pickupTime) && <Info icon={MapPin} label={order.orderType === "delivery" ? "Địa chỉ" : "Thời gian nhận"} value={order.deliveryAddress || order.pickupTime || "—"} />}
          {Boolean(order.loyaltyPointsEarned) && <Info icon={CheckCircle2} label="Điểm nhận được" value={`+${order.loyaltyPointsEarned} điểm`} />}
        </div>
      </section>

      <section className="brand-card p-5">
        <h2 className="brand-heading text-lg">Sản phẩm đã đặt</h2>
        <div className="mt-4 divide-y divide-sand/70">{order.items.map((item) => <article key={item.cartItemId} className="flex gap-3 py-4 first:pt-0 last:pb-0"><Link href={`/san-pham/${encodeURIComponent(item.productId)}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-soft"><ProductImage src={item.imageUrl} alt={item.productName} /></Link><div className="min-w-0 flex-1"><Link href={`/san-pham/${encodeURIComponent(item.productId)}`} className="font-black text-navy hover:text-brand-500">{item.productName}</Link><p className="mt-1 text-xs leading-5 text-text-muted">{getCartItemVariantDetails(item).join(" · ") || "Phiên bản tiêu chuẩn"}</p><div className="mt-2 flex items-end justify-between gap-2"><span className="text-xs font-bold text-text-muted">Số lượng: {item.quantity}</span><strong className="text-sm text-brand-500">{formatPrice(item.price * item.quantity)}</strong></div></div></article>)}</div>
      </section>

      <section className="brand-card p-5">
        <h2 className="brand-heading text-lg">Thanh toán</h2>
        <div className="mt-4 space-y-2 text-sm"><SummaryRow label="Tạm tính" value={formatPrice(subtotal)} />{Boolean(order.discountAmount) && <SummaryRow label="Giảm giá" value={`-${formatPrice(order.discountAmount ?? 0)}`} />}{Boolean(order.deliveryFee) && <SummaryRow label="Phí giao hàng" value={formatPrice(order.deliveryFee ?? 0)} />}<div className="my-3 h-px bg-sand" /><SummaryRow label="Tổng cộng" value={formatPrice(order.totalAmount)} strong /></div>
      </section>
    </div>
  </main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return <div className="flex gap-3 rounded-xl bg-bg-soft/65 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" /><div><p className="text-xs font-bold text-text-muted">{label}</p><p className="mt-1 font-black leading-5 text-navy">{value}</p></div></div>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className={strong ? "font-black text-navy" : "text-text-muted"}>{label}</span><span className={strong ? "text-lg font-black text-brand-500" : "font-bold text-navy"}>{value}</span></div>;
}
