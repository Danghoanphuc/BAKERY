"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, Calculator, Factory, Landmark } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { href: "/admin/finance", label: "Tổng quan", description: "P&L và dòng tiền", icon: BarChart3 },
  { href: "/admin/finance/costing", label: "Giá thành", description: "Nguyên liệu & BOM", icon: Calculator },
  { href: "/admin/finance/operations", label: "Vận hành", description: "Mua · Sản xuất · Kho", icon: Factory },
  { href: "/admin/finance/management", label: "Quản trị", description: "Budget & phân bổ", icon: Landmark },
  { href: "/admin/inventory", label: "Sản phẩm", description: "Danh mục bán", icon: Boxes },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = item.href === "/admin/finance"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-w-[148px] items-center gap-3 rounded-xl px-3 py-2.5 transition",
                active
                  ? "bg-neutral-950 text-white shadow-md"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
              )}
            >
              <span className={clsx("grid h-9 w-9 place-items-center rounded-lg", active ? "bg-white/15" : "bg-brand-50 text-brand-700")}>
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold">{item.label}</span>
                <span className={clsx("block text-[11px]", active ? "text-white/60" : "text-neutral-400")}>{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

