"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDollarSign,
  Home,
  Layers,
  Megaphone,
  Package,
  ScanLine,
  ShoppingBag,
  TicketPercent,
  Users,
} from "lucide-react";
import { clsx } from "clsx";

const menuItems = [
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
    label: "Khuyến mãi",
    icon: Megaphone,
    href: "/admin/marketing",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center border-b border-neutral-200 px-6">
        <h1 className="text-xl font-bold text-primary-600">Bakery Admin</h1>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    "text-sm font-medium",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-neutral-200 p-4 text-xs text-neutral-500">
        <p>Version 1.0.0</p>
        <p className="mt-1">© 2026 Bakery Admin</p>
      </div>
    </aside>
  );
}
