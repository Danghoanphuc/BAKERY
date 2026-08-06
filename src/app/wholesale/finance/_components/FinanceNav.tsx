"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, Calculator, Factory, Landmark } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { href: "/wholesale/finance", label: "Tổng quan", description: "P&L và dòng tiền", icon: BarChart3 },
  { href: "/wholesale/finance/costing", label: "Giá thành", description: "Nguyên liệu & BOM", icon: Calculator },
  { href: "/wholesale/finance/operations", label: "Vận hành", description: "Mua · Sản xuất · Kho", icon: Factory },
  { href: "/wholesale/finance/management", label: "Quản trị", description: "Budget & phân bổ", icon: Landmark },
  { href: "/wholesale/inventory", label: "Sản phẩm", description: "Danh mục bán", icon: Boxes },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Điều hướng tài chính" className="overflow-x-auto border-b border-sand [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-5">
        {items.map((item) => {
          const active = item.href === "/wholesale/finance"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-2 transition-colors duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 active:text-brand-700",
                active
                  ? "border-brand-600 text-neutral-950"
                  : "border-transparent text-neutral-500 hover:border-sand hover:text-neutral-950",
              )}
            >
              <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-brand-700" : "text-neutral-400")} />
              <span>
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="hidden text-[11px] text-neutral-400 sm:block">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
