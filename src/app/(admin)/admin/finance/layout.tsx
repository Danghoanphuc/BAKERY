import type { ReactNode } from "react";
import { FinanceNav } from "./_components/FinanceNav";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[#eadbcc] bg-[linear-gradient(135deg,#fffaf6_0%,#fff_55%,#f8eee5_100%)] px-5 py-5 shadow-[0_10px_35px_rgba(94,55,30,0.06)] sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Finance workspace
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
              Tài chính & kế toán quản trị
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Một nơi để theo dõi dòng tiền, giá vốn, sản xuất, ngân sách và hiệu quả vận hành của tiệm bánh.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:text-left">
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
    <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-0.5 font-bold text-neutral-800">{value}</p>
    </div>
  );
}

