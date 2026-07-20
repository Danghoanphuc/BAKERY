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
  Workflow,
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
    id: "growth-studio",
    label: "Studio tăng trưởng",
    icon: Workflow,
    href: "/admin/growth-studio",
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
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sand bg-bg-card",
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
          <BrandLogo variant="mark" className="h-10 w-10 shrink-0 rounded-xl" alt="" />
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-navy">
              SweetTime Admin
            </span>
            <span className="block truncate text-xs font-semibold text-text-muted">
              Tiệm bánh & vận hành
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-sand bg-bg-card text-navy transition-colors duration-200 ease-[var(--ease-out)] hover:border-brand-400 hover:text-brand-700 active:translate-y-px"
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
                    "group relative flex h-12 items-center rounded-xl border text-sm font-bold transition-colors duration-200 ease-[var(--ease-out)]",
                    isExpanded ? "gap-3 px-3" : "justify-center px-0",
                    isActive
                      ? "border-sand bg-bg-soft text-navy"
                      : "border-transparent text-text-muted hover:border-sand hover:bg-bg-main hover:text-navy",
                  )}
                >
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
        <div className="px-2 py-2 text-xs font-semibold text-text-muted">
          {isExpanded ? (
            <>
              <p className="truncate text-navy">{admin.name}</p>
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
