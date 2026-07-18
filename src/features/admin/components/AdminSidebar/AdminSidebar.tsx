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
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ADMIN_ROLE_LABELS, canAdminAccessPath, type AdminPrincipal } from "@/lib/auth/admin-rbac";

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
    id: "marketing",
    label: "Marketing & ưu đãi",
    icon: Megaphone,
    href: "/admin/marketing",
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
    id: "security",
    label: "An toàn",
    icon: ShieldCheck,
    href: "/admin/security",
  },
];

export function AdminSidebar({ admin }: { admin: AdminPrincipal }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sand bg-bg-card shadow-[6px_0_24px_oklch(27%_0.045_48/0.07)] transition-[width] duration-200",
        isExpanded ? "w-64" : "w-[76px]",
      )}
    >
      <div
        className={clsx(
          "flex h-20 items-center border-b border-sand px-3",
          isExpanded ? "justify-between" : "justify-center",
        )}
      >
        <Link
          href="/admin"
          className={clsx(
            "min-w-0 items-center gap-3 font-display",
            isExpanded ? "flex" : "hidden",
          )}
        >
          <BrandLogo variant="mark" className="h-10 w-10 shrink-0 rounded-xl shadow-sm" alt="" />
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-[#1f2e4a]">
              SweetTime Admin
            </span>
            <span className="block truncate text-xs font-semibold text-[#7e6a59]">
              Tiệm bánh & vận hành
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy transition hover:border-accent-gold hover:text-teal"
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
          {menuItems.filter((item) => canAdminAccessPath(admin.role, item.href)).map((item) => {
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
                    "group relative flex h-12 items-center rounded-xl text-sm font-bold transition",
                    isExpanded ? "gap-3 px-3" : "justify-center px-0",
                    isActive
                      ? "bg-bg-soft text-navy shadow-sm ring-1 ring-sand"
                      : "text-text-muted hover:bg-bg-main hover:text-navy",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />
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
          "border-t border-sand p-3",
          isExpanded ? "text-left" : "text-center",
        )}
      >
        <div className="rounded-xl bg-bg-soft px-3 py-3 text-xs font-semibold text-text-muted ring-1 ring-sand">
          {isExpanded ? (
            <>
              <p className="truncate text-[#1f2e4a]">{admin.name}</p>
              <p className="mt-1 truncate">{ADMIN_ROLE_LABELS[admin.role]}</p>
            </>
          ) : (
            <span>v1</span>
          )}
        </div>
      </div>
    </aside>
  );
}
