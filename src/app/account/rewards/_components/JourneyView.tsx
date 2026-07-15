import Image from "next/image";
import { Check, ChevronRight, Heart, ShoppingBag, Sparkles, Trophy } from "lucide-react";

import { formatCurrency, formatNumber } from "./rewards-format";
import type { MyRewardsData } from "./types";

export function JourneyView({ data }: { data: MyRewardsData }) {
  return <div className="space-y-7">
    <section>
      <SectionHeading label="Hành trình thứ hạng" detail={data.points.neededForNextTier > 0 ? `Còn ${formatNumber(data.points.neededForNextTier)} điểm để lên hạng` : "Bạn đang ở hạng cao nhất"} />
      <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">{data.journey.tiers.map((tier) => <TierItem key={tier.id} tier={tier} current={tier.id === data.journey.currentTierId} />)}</div>
    </section>

    <section>
      <SectionHeading label="Dấu ấn của bạn" />
      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl bg-white sm:grid-cols-4">
        <Metric icon={<Trophy />} label="Đơn hoàn tất" value={formatNumber(data.totals.orderCount)} />
        <Metric icon={<Sparkles />} label="Điểm đã tích" value={formatNumber(data.points.totalEarned)} />
        <Metric icon={<Heart />} label="Lần chọn món ruột" value={formatNumber(data.totals.favoriteQuantity)} />
        <Metric icon={<ShoppingBag />} label="Đã chi tiêu" value={formatCurrency(data.totals.lifetimeValue)} />
      </div>
      <p className="mt-2 text-xs text-[#7b6254]">Món được yêu thích nhất: <strong className="text-[#542413]">{data.totals.favoriteProduct}</strong></p>
    </section>

    <section>
      <SectionHeading label="Kiếm thêm điểm" detail="Những cách đơn giản để nhận thêm quyền lợi" />
      <div className="mt-2 divide-y divide-[#efdfcf]">
        <EarnRow number="01" title="Mua món yêu thích" description="Nhận điểm sau mỗi đơn hoàn tất" />
        <EarnRow number="02" title="Hoàn thiện hồ sơ" description="Thêm sinh nhật để mở ưu đãi riêng" />
        <EarnRow number="03" title="Quay lại thường xuyên" description="Đón các chiến dịch nhân điểm" />
      </div>
    </section>
  </div>;
}

function SectionHeading({ label, detail }: { label: string; detail?: string }) {
  return <div className="flex items-end justify-between gap-4"><h2 className="text-[15px] font-black text-[#542413]">{label}</h2>{detail && <p className="text-right text-[11px] font-medium text-[#7b6254]">{detail}</p>}</div>;
}

function TierItem({ tier, current }: { tier: MyRewardsData["journey"]["tiers"][number]; current: boolean }) {
  return <article className={`relative min-w-[132px] rounded-xl px-3 py-3 ${current ? "bg-[#c35847] text-white" : "bg-[#fff3df] text-[#542413]"}`}>
    <div className="flex items-center justify-between"><div className={`grid h-8 w-8 place-items-center overflow-hidden rounded-lg text-xs font-black ${current ? "bg-white/15" : "bg-[#fffaf6]"}`}>{tier.imageUrl ? <Image src={tier.imageUrl} alt={tier.name} width={32} height={32} className="h-full w-full object-cover" /> : tier.name.slice(0, 1)}</div>{tier.unlocked && <Check className={`h-3.5 w-3.5 ${current ? "text-[#f2b333]" : "text-emerald-600"}`} />}</div>
    <h3 className="mt-2.5 text-xs font-black">{tier.name}</h3><p className={`mt-0.5 text-[9px] font-semibold ${current ? "text-white/70" : "text-[#7b6254]"}`}>{formatNumber(tier.threshold)} điểm</p>
  </article>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="border-b border-r border-[#efdfcf] p-3 last:border-r-0 sm:border-b-0"><div className="h-3.5 w-3.5 text-[#c35847]">{icon}</div><p className="mt-2 truncate text-sm font-black text-[#542413]">{value}</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#7b6254]">{label}</p></div>;
}

function EarnRow({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-center gap-3 py-3"><span className="text-[10px] font-black text-[#c35847]">{number}</span><div className="min-w-0 flex-1"><h3 className="text-xs font-black text-[#542413]">{title}</h3><p className="mt-0.5 text-[10px] text-[#7b6254]">{description}</p></div><ChevronRight className="h-3.5 w-3.5 text-[#efc79e]" /></div>;
}
