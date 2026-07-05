"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Info, Pencil, Ticket } from "lucide-react";

import { getInitials } from "./rewards-format";
import type { MyRewardsData } from "./types";

export function MemberHeader({
  data,
  onShowOffers,
}: {
  data: MyRewardsData;
  onShowOffers: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <CircleButton href="/profile" label="Quay lại">
          <ArrowLeft className="h-5 w-5" />
        </CircleButton>
        <CircleButton href="/account/password" label="Tài khoản">
          <Info className="h-5 w-5" />
        </CircleButton>
      </div>

      <section className="mt-5 grid grid-cols-[108px_1fr] items-center gap-4">
        <div className="relative">
          <div className="grid h-[104px] w-[104px] place-items-center rounded-full border-4 border-[#f1c678] bg-[#fff1d8] shadow-[0_8px_18px_rgba(122,53,31,0.14)]">
            <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white text-2xl font-black text-[#7a351f]">
              {getInitials(data.customer.name)}
            </div>
          </div>
          <Link
            href="/profile"
            className="absolute bottom-0 right-1 grid h-9 w-9 place-items-center rounded-full border-[3px] border-white bg-[#f0a12d] text-white shadow-sm"
            aria-label="Sửa hồ sơ"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>

        <div className="min-w-0">
          <h1 className="break-words text-[24px] font-black uppercase leading-tight text-[#74351f]">
            {data.customer.name}
          </h1>
          <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[#f1a58d] bg-[#fff1e8] px-3 py-1.5 text-xs font-black uppercase text-[#7a351f] shadow-sm">
            <span className="text-lg leading-none">{data.customer.tierIcon}</span>
            <span className="truncate">{data.customer.tier}</span>
          </div>
          <button
            type="button"
            onClick={onShowOffers}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d29233] bg-[#ffc94d] px-3 text-sm font-black uppercase text-[#74351f] shadow-[0_3px_0_#c88426] active:translate-y-0.5 active:shadow-[0_1px_0_#c88426]"
          >
            <Ticket className="h-4 w-4" />
            Kho voucher của tôi
          </button>
        </div>
      </section>
    </>
  );
}

function CircleButton({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
}) {
  const className =
    "grid h-10 w-10 place-items-center rounded-full border border-[#d28a58] bg-[#a95731] text-white shadow-[0_3px_0_#74351f]";

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={label}>
      {children}
    </button>
  );
}
