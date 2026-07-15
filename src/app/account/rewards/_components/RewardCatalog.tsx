import Image from "next/image";
import { Gift, LockKeyhole, PackageOpen } from "lucide-react";

import { formatNumber } from "./rewards-format";
import type { MyRewardsData } from "./types";

export function RewardCatalog({ rewards, currentPoints }: { rewards: MyRewardsData["rewardCatalog"]; currentPoints: number }) {
  const sorted = [...rewards].sort((left, right) => Number(left.pointsCost > currentPoints) - Number(right.pointsCost > currentPoints) || left.pointsCost - right.pointsCost);
  return <section><header><h2 className="text-base font-black text-[#542413]">Đổi thưởng</h2><p className="mt-1 text-[11px] text-[#7b6254]">Bạn có {formatNumber(currentPoints)} điểm khả dụng</p></header>
    {sorted.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sorted.map((reward) => <RewardCard key={reward.id} reward={reward} currentPoints={currentPoints} />)}</div> : <EmptyCatalog />}
  </section>;
}

function RewardCard({ reward, currentPoints }: { reward: MyRewardsData["rewardCatalog"][number]; currentPoints: number }) {
  const affordable = currentPoints >= reward.pointsCost;
  const available = reward.stock === undefined || reward.stock > 0;
  return <article className="overflow-hidden rounded-2xl border border-[#efdfcf] bg-[#fffaf6] shadow-sm"><div className="relative aspect-[2/1] bg-[#fff3df]">{reward.imageUrl ? <Image src={reward.imageUrl} alt={reward.name} fill className="object-cover" /> : <div className="grid h-full place-items-center"><Gift className="h-8 w-8 text-[#c35847]" /></div>}<span className="absolute left-2.5 top-2.5 rounded-full bg-[#fff3e8] px-2 py-0.5 text-[9px] font-black uppercase text-[#9b3f24]">{reward.type}</span></div><div className="p-3"><h3 className="text-sm font-black text-[#542413]">{reward.name}</h3><p className="mt-1 min-h-8 text-[11px] font-semibold leading-4 text-[#7b6254]">{reward.description || `Có hiệu lực ${reward.validityDays} ngày sau khi đổi.`}</p><div className="mt-2.5 flex items-center justify-between"><strong className="text-base font-black text-[#c35847]">{formatNumber(reward.pointsCost)} điểm</strong><span className="text-[9px] font-bold text-[#7b6254]">Còn {reward.stock ?? "∞"}</span></div><button type="button" disabled className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f0e3d3] text-[11px] font-black text-[#7b6254]">{!available ? <><PackageOpen className="h-3.5 w-3.5" /> Tạm hết</> : affordable ? <><Gift className="h-3.5 w-3.5" /> Sắp mở đổi online</> : <><LockKeyhole className="h-3.5 w-3.5" /> Thiếu {formatNumber(reward.pointsCost - currentPoints)} điểm</>}</button></div></article>;
}
function EmptyCatalog() { return <div className="mt-4 rounded-2xl border border-dashed border-[#efc79e] bg-[#fffaf6] p-8 text-center"><Gift className="mx-auto h-8 w-8 text-[#c35847]" /><h3 className="mt-3 text-sm font-black text-[#542413]">Kho quà đang được chuẩn bị</h3><p className="mt-1 text-xs text-[#7b6254]">Phần thưởng mới sẽ sớm xuất hiện tại đây.</p></div>; }
