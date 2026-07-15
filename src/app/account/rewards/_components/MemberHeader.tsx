import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gift, Ticket } from "lucide-react";

import { formatNumber } from "./rewards-format";
import type { MyRewardsData } from "./types";

export function MemberHeader({ data, onNavigate }: { data: MyRewardsData; onNavigate: (view: "rewards" | "vouchers") => void }) {
  const nextTier = data.journey.tiers.find((tier) => tier.id === data.journey.nextTierId);

  return <>
    <div className="mb-2 flex items-center justify-between"><Link href="/account" className="inline-flex h-7 items-center gap-1 text-[11px] font-bold text-[#7b6254]"><ArrowLeft className="h-3.5 w-3.5" /> Tài khoản</Link><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b98770]">Sweet member</span></div>
    <section className="relative overflow-hidden rounded-2xl border border-[#efc79e] bg-[#ffe2df] px-4 py-4 text-[#542413] shadow-[0_8px_22px_rgba(209,89,92,0.10)] sm:px-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#fff3e8] text-sm font-black">{data.customer.tierImageUrl ? <Image src={data.customer.tierImageUrl} alt={data.customer.tier} width={40} height={40} className="h-full w-full object-cover" /> : data.customer.tier.slice(0, 1)}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{data.customer.name}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c35847]">Hạng {data.customer.tier}</p></div>
        <div className="text-right"><strong className="text-2xl font-black leading-none text-[#c35847]">{formatNumber(data.points.current)}</strong><p className="mt-1 text-[9px] font-bold text-[#9a7462]">điểm khả dụng</p></div>
      </div>
      <div className="mt-3 flex items-center gap-3"><div className="h-1 flex-1 overflow-hidden rounded-full bg-[#f0d8c2]"><div className="h-full rounded-full bg-[#f2b333]" style={{ width: `${data.points.progressPercent}%` }} /></div><span className="shrink-0 text-[9px] font-semibold text-[#7b6254]">{nextTier ? `${formatNumber(data.points.neededForNextTier)} điểm tới ${nextTier.name}` : "Hạng cao nhất"}</span></div>
      <div className="mt-3 flex gap-2 border-t border-[#efc7bd] pt-3"><button type="button" onClick={() => onNavigate("rewards")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#c35847] px-3 text-[10px] font-black text-white"><Gift className="h-3 w-3" /> Đổi thưởng</button><button type="button" onClick={() => onNavigate("vouchers")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#fff3e8] px-3 text-[10px] font-black text-[#9b3f24]"><Ticket className="h-3 w-3" /> Voucher</button></div>
    </section>
  </>;
}
