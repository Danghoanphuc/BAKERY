"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Home,
  Layers,
  Megaphone,
  Package,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TicketPercent,
  Users,
} from "lucide-react";
import { clsx } from "clsx";

const menuItems = [
  {
    id: "pos",
    label: "POS - Bán hàng",
    icon: ShoppingCart,
    href: "/admin/pos",
  },
  {
    id: "dashboard",
    label: "Tổng quan",
    icon: Home,
    href: "/admin",
  },
  {
    id: "orders",
    label: "Đơn hàng",
    icon: ShoppingBag,
    href: "/admin/orders",
  },
  {
    id: "customers",
    label: "Khách hàng",
    icon: Users,
    href: "/admin/customers",
  },
  {
    id: "vouchers",
    label: "Voucher",
    icon: TicketPercent,
    href: "/admin/vouchers",
  },
  {
    id: "voucher-scan",
    label: "Quét tại quầy",
    icon: ScanLine,
    href: "/admin/vouchers/scan",
  },
  {
    id: "finance",
    label: "Tài chính",
    icon: CircleDollarSign,
    href: "/admin/finance",
  },
  {
    id: "categories",
    label: "Danh mục",
    icon: Layers,
    href: "/admin/categories",
  },
  {
    id: "inventory",
    label: "Kho/Sản phẩm",
    icon: Package,
    href: "/admin/inventory",
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    href: "/admin/marketing",
  },
  {
    id: "security",
    label: "An toàn",
    icon: ShieldCheck,
    href: "/admin/security",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-[#eadbcc] bg-[#fffaf6] shadow-[8px_0_24px_rgba(61,36,23,0.06)] transition-[width] duration-200",
        isExpanded ? "w-64" : "w-[76px]",
      )}
    >
      <div
        className={clsx(
          "flex h-20 items-center border-b border-[#f0e1d2] px-3",
          isExpanded ? "justify-between" : "justify-center",
        )}
      >
        <Link
          href="/admin"
          className={clsx(
            "min-w-0 items-center gap-3",
            isExpanded ? "flex" : "hidden",
          )}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#b84a39] text-sm font-black text-white shadow-[0_10px_20px_rgba(184,74,57,0.22)]">
            B
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-[#3d2417]">
              Bakery Admin
            </span>
            <span className="block truncate text-xs font-semibold text-[#9b8171]">
              Tiệm bánh & vận hành
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-[#eadbcc] bg-white text-[#65483a] transition hover:border-[#b84a39]/40 hover:text-[#b84a39]"
          aria-label={isExpanded ? "Thu gọn sidebar" : "Mở rộng sidebar"}
          title={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  title={!isExpanded ? item.label : undefined}
                  className={clsx(
                    "group relative flex h-12 items-center rounded-2xl text-sm font-bold transition",
                    isExpanded ? "gap-3 px-3" : "justify-center px-0",
                    isActive
                      ? "bg-white text-[#b84a39] shadow-sm ring-1 ring-[#f0e1d2]"
                      : "text-[#7b6254] hover:bg-white/80 hover:text-[#3d2417]",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#b84a39]" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={clsx(
          "border-t border-[#f0e1d2] p-3",
          isExpanded ? "text-left" : "text-center",
        )}
      >
        <div className="rounded-2xl bg-white px-3 py-3 text-xs font-semibold text-[#9b8171] ring-1 ring-[#f0e1d2]">
          {isExpanded ? (
            <>
              <p className="text-[#3d2417]">Bakery POS</p>
              <p className="mt-1">Version 1.0.0</p>
            </>
          ) : (
            <span>v1</span>
          )}
        </div>
      </div>
    </aside>
  );
}
