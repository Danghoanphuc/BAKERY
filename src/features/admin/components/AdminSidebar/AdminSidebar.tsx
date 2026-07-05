"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Package, Megaphone, Users, Layers, ScanLine } from "lucide-react";
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
    label: "Quét voucher",
    icon: ScanLine,
    href: "/admin/vouchers",
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
    <aside className="w-64 bg-white border-r border-neutral-200 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200">
        <h1 className="text-xl font-bold text-primary-600">🍰 Bakery Admin</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    "text-sm font-medium",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 text-xs text-neutral-500">
        <p>Version 1.0.0</p>
        <p className="mt-1">© 2026 Bakery Admin</p>
      </div>
    </aside>
  );
}
