import type { ReactNode } from "react";
import { FinanceNav } from "./_components/FinanceNav";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-5">
      <header className="border-b border-sand pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Finance workspace
            </p>
            <h1 className="mt-1 min-w-0 font-display text-[length:var(--type-admin-title)] font-semibold leading-tight tracking-tight text-neutral-950 [overflow-wrap:anywhere]">
              Tài chính & kế toán quản trị
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-neutral-600 sm:block">
              Một nơi để theo dõi dòng tiền, giá vốn, sản xuất, ngân sách và hiệu quả vận hành của tiệm bánh.
            </p>
          </div>
          <div className="hidden flex-wrap gap-x-5 gap-y-2 text-left lg:flex">
            <HeaderBadge label="Nguồn dữ liệu" value="Đơn · Kho · Chi phí" />
            <HeaderBadge label="Giá vốn" value="BOM & thực tế" />
            <HeaderBadge label="Kiểm soát" value="Budget & variance" />
          </div>
        </div>
      </header>
      <FinanceNav />
      {children}
    </div>
  );
}

function HeaderBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-xs font-bold text-neutral-800">{value}</p>
    </div>
  );
}
