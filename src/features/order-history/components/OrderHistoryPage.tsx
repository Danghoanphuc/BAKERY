"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  RotateCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import type { Order } from "@prisma/client";

// --- Dữ liệu từ API ---
type OrderStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "cancelled"
  | "completed";

interface OrderItem {
  id: string;
  title: string;
  itemCount: number;
  date: string;
  price: number;
  pointsEarned: number;
  status: OrderStatus;
  type: "pickup" | "delivery";
  imageUrl: string;
  storeName?: string;
  items: any[];
}

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pickup", label: "Đến lấy" },
  { id: "delivery", label: "Giao tận nơi" },
];

export default function OrderHistory() {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data: Order[] = await res.json();
          // Transform data
          const transformedOrders: OrderItem[] = data.map((order) => {
            // Parse items from JSON string
            const items =
              typeof order.items === "string"
                ? (JSON.parse(order.items) as any[])
                : (order.items as any[]);

            const firstItem = items[0];
            const totalCount = items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            const dateObj = order.createdAt
              ? typeof order.createdAt === "string"
                ? new Date(order.createdAt)
                : order.createdAt
              : new Date();

            const formattedDate = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A";

            return {
              id: order.id,
              title: firstItem?.name || "Đơn hàng",
              itemCount: totalCount,
              date: formattedDate,
              price: order.totalAmount,
              pointsEarned: Math.floor(order.totalAmount / 10000),
              status: order.status.toLowerCase() as OrderStatus,
              type:
                order.orderType.toLowerCase() === "pickup"
                  ? "pickup"
                  : "delivery",
              imageUrl:
                firstItem?.image ||
                "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&q=80",
              storeName:
                order.orderType.toLowerCase() === "pickup"
                  ? "Đến lấy tại quán"
                  : order.deliveryAddress
                    ? "Giao tận nơi"
                    : "Mua tại quán",
              items, // Store original items for "Mua lại"
            };
          });
          setOrders(transformedOrders);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Lọc đơn hàng theo tab
  const filteredOrders = orders.filter((order) =>
    activeTab === "all" ? true : order.type === activeTab,
  );

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto min-h-screen w-full max-w-[520px] px-4 pb-20 pt-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-[#f4ebe1] p-2 transition hover:bg-[#eadecc] active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-text-primary" />
            </Link>
            <h1 className="text-xl font-bold text-text-primary">
              Lịch sử đơn hàng
            </h1>
          </div>
          <button className="rounded-full p-2 text-text-muted transition hover:bg-[#f4ebe1] active:scale-95">
            <Search className="h-5 w-5" />
          </button>
        </header>

        {/* Tabs Filter */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-text-secondary text-white shadow-md"
                  : "bg-[#f4ebe1] text-text-muted hover:bg-[#eadecc]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Orders */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <article
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#f0e3d3] bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between border-b border-[#f9eedf] pb-3">
                  <div className="h-3 w-32 rounded-full bg-[#f4ebe1] animate-pulse" />
                  <div className="h-6 w-20 rounded-full bg-[#f4ebe1] animate-pulse" />
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-[#f4ebe1] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded bg-[#f4ebe1] animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-[#f4ebe1] animate-pulse" />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="h-6 w-24 rounded bg-[#f4ebe1] animate-pulse" />
                      <div className="h-10 w-24 rounded-full bg-[#f4ebe1] animate-pulse" />
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#f4ebe1]">
                <ShoppingBag className="h-10 w-10 text-[#dcb8a0]" />
              </div>
              <p className="text-lg font-semibold text-text-primary">
                Chưa có đơn hàng nào
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Bạn chưa có đơn hàng nào trong mục này.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderItem }) {
  // Config màu sắc và text cho status
  const statusConfig: Record<
    OrderStatus,
    { text: string; color: string; bg: string }
  > = {
    completed: {
      text: "Hoàn thành",
      color: "text-accent-healthy",
      bg: "bg-[#f4f7e6]",
    },
    delivered: {
      text: "Đã giao",
      color: "text-accent-healthy",
      bg: "bg-[#f4f7e6]",
    },
    processing: {
      text: "Đang chuẩn bị",
      color: "text-accent-star",
      bg: "bg-[#fcf4e8]",
    },
    pending: {
      text: "Chờ xác nhận",
      color: "text-accent-star",
      bg: "bg-[#fcf4e8]",
    },
    cancelled: { text: "Đã hủy", color: "text-text-muted", bg: "bg-[#f4ebe1]" },
  };

  const currentStatus = statusConfig[order.status] || {
    text: "Không xác định",
    color: "text-text-muted",
    bg: "bg-[#f4ebe1]",
  };
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  const handleBuyAgain = () => {
    // Add all items from the order back to cart
    order.items.forEach((item) => {
      addItem({
        productId: item.productId,
        productName: item.productName ?? item.name,
        price: item.price,
        imageUrl: item.imageUrl ?? item.image,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedFlavor: item.selectedFlavor,
        customMessage: item.customMessage,
        candles: item.candles,
      });
    });

    // Navigate to cart
    router.push("/cart");
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#f0e3d3] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header của thẻ đơn hàng */}
      <div className="mb-2 flex items-center justify-between border-b border-[#f9eedf] pb-2">
        <span className="text-[11px] font-medium text-text-muted">
          {order.date}
        </span>
        <span
          className={clsx(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            currentStatus.bg,
            currentStatus.color,
          )}
        >
          {currentStatus.text}
        </span>
      </div>

      {/* Nội dung chính: Ảnh và Tên món */}
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#fdf9f4]">
          <Image
            src={order.imageUrl}
            alt={order.title}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-text-primary line-clamp-1">
              {order.title}
            </h3>
            <p className="text-xs text-text-muted">
              {order.storeName} • {order.itemCount} sản phẩm
            </p>
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-brand-500">
                {formatPrice(order.price).replace(" ", "")}
              </span>
              {order.pointsEarned > 0 && order.status !== "cancelled" && (
                <span className="flex items-center gap-0.5 rounded-full bg-[#fceecb] px-1.5 py-0.5 text-[10px] font-semibold text-accent-star">
                  <Sparkles className="h-3 w-3" />+{order.pointsEarned} điểm
                </span>
              )}
            </div>

            <button
              onClick={handleBuyAgain}
              className="flex items-center justify-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Mua lại
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
