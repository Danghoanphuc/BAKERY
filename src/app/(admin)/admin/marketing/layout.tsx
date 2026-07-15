"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Gift, TicketPercent } from "lucide-react";

const sections = [
  { href: "/admin/marketing", label: "Tổng quan", icon: BarChart3, exact: true },
  { href: "/admin/marketing/vouchers", label: "Voucher", icon: TicketPercent },
  { href: "/admin/marketing/loyalty", label: "Tích điểm", icon: Gift },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="space-y-5"><nav aria-label="Điều hướng Marketing" className="flex flex-wrap gap-1 rounded-xl border border-[#eadbcc] bg-[#fffaf6] p-1.5 shadow-sm">{sections.map((section) => { const active = section.exact ? pathname === "/admin/marketing" : pathname.startsWith(section.href); const Icon = section.icon; return <Link key={section.label} href={section.href} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${active ? "bg-[#b84a39] text-white shadow-sm" : "text-[#69483a] hover:bg-white"}`}><Icon className="h-4 w-4" />{section.label}</Link>; })}</nav>{children}</div>;
}
