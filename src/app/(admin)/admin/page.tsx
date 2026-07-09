"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { getAllOrders, getInventoryProducts } from "@/lib/firebase";
import type { Order } from "@/types";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [databaseOrders, inventoryProducts] = await Promise.all([
          getAllOrders(),
          getInventoryProducts(),
        ]);

        if (!isMounted) return;

        setOrders(databaseOrders);
        setProductCount(inventoryProducts.length);
      } catch (error) {
        console.error("Failed to load admin dashboard data:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const ordersToday = orders.filter(
      (order) => order.createdAt.toDateString() === today,
    ).length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const uniqueCustomers = new Set(
      orders.map(
        (order) =>
          order.customerEmail?.trim().toLowerCase() ||
          order.customerPhone ||
          order.customerName,
      ),
    ).size;

    return [
      {
        id: "orders",
        label: "Đơn hôm nay",
        value: ordersToday.toString(),
        detail: `${orders.length} đơn trong hệ thống`,
        icon: ShoppingBag,
        href: "/admin/orders",
      },
      {
        id: "revenue",
        label: "Doanh thu",
        value: formatCompactCurrency(totalRevenue),
        detail: "Tổng doanh thu ghi nhận",
        icon: TrendingUp,
        href: "/admin/finance",
      },
      {
        id: "products",
        label: "Sản phẩm",
        value: productCount.toString(),
        detail: "Đồng bộ từ Firestore",
        icon: Package,
        href: "/admin/inventory",
      },
      {
        id: "customers",
        label: "Khách hàng",
        value: uniqueCustomers.toString(),
        detail: "Tính theo đơn hiện có",
        icon: Users,
        href: "/admin/customers",
      },
    ];
  }, [orders, productCount]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] shadow-[0_18px_42px_rgba(61,36,23,0.08)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#d85d6c] ring-1 ring-[#f0e1d2]">
              <Sparkles className="h-3.5 w-3.5" />
              Bakery Operations
            </div>
            <h1 className="mt-4 text-3xl font-black text-[#3d2417]">
              Tổng quan vận hành
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#7b6254]">
              Một màn hình gọn để theo dõi đơn, sản phẩm, khách hàng và tài chính
              trước khi đi vào từng khu vực quản trị.
            </p>
          </div>

          <Link
            href="/admin/pos"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#d85d6c] px-5 text-sm font-black text-white shadow-[0_16px_28px_rgba(216,93,108,0.24)] transition hover:bg-[#c94c5c]"
          >
            Mở POS
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {isLoading && (
        <div className="rounded-2xl border border-[#f0e1d2] bg-white px-4 py-3 text-sm font-bold text-[#7b6254]">
          Đang tải số liệu từ database...
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.id}
              href={stat.href}
              className="group rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] p-5 shadow-[0_14px_34px_rgba(61,36,23,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(61,36,23,0.10)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#d85d6c] shadow-sm ring-1 ring-[#f0e1d2]">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-[#c5aa99] transition group-hover:translate-x-1 group-hover:text-[#d85d6c]" />
              </div>
              <p className="mt-5 text-sm font-bold text-[#7b6254]">{stat.label}</p>
              <p className="mt-1 text-3xl font-black text-[#3d2417]">
                {stat.value}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#9b8171]">
                {stat.detail}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-[#f0e1d2] bg-[#fffaf6] p-5 shadow-[0_14px_34px_rgba(61,36,23,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#3d2417]">
                Thao tác nhanh
              </h2>
              <p className="mt-1 text-sm font-medium text-[#8a6f60]">
                Đi thẳng vào các luồng vận hành thường dùng.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <QuickAction
              href="/admin/orders"
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Xem đơn mới"
            />
            <QuickAction
              href="/admin/inventory"
              icon={<Package className="h-5 w-5" />}
              label="Quản lý sản phẩm"
            />
            <QuickAction
              href="/admin/finance"
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Xem tài chính"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#f0e1d2] bg-[#3d2417] p-5 text-white shadow-[0_18px_42px_rgba(61,36,23,0.12)]">
          <p className="text-sm font-black text-[#ffd4a8]">Nhịp vận hành</p>
          <p className="mt-3 text-3xl font-black">{orders.length}</p>
          <p className="mt-1 text-sm font-semibold text-white/72">
            đơn đang được ghi nhận trong hệ thống. Kiểm tra đơn quá hạn ở trang
            đơn hàng trước giờ cao điểm.
          </p>
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-[#f0e1d2] bg-white px-4 py-3 text-left font-black text-[#3d2417] transition hover:border-[#d85d6c]/40 hover:bg-[#fff1f0]"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff1f0] text-[#d85d6c]">
          {icon}
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-[#c5aa99]" />
    </Link>
  );
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}
