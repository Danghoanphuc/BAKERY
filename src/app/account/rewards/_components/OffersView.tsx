"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, QrCode, Scissors, TicketPercent, X } from "lucide-react";

import { getDefaultVoucherUseMode, toSelectedCustomerVoucher, VoucherUseModeSheet, type CustomerVoucher } from "@/features/vouchers";
import { createPosVoucherToken } from "@/lib/pos-voucher-token";
import { useVoucherStore } from "@/store/voucherStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { VoucherUseMode } from "@/types/voucher";
import type { MyRewardsData } from "./types";

export function OffersView({ data }: { data: MyRewardsData }) {
  const router = useRouter();
  const { setSelectedVoucher } = useVoucherStore();
  const deliveryMode = useOrderConfigStore((state) => state.config.deliveryMode);
  const [voucherToUse, setVoucherToUse] = useState<CustomerVoucher | null>(null);
  const [posVoucher, setPosVoucher] = useState<CustomerVoucher | null>(null);
  const vouchers = [...data.vouchers].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  function useVoucher(voucher: CustomerVoucher, mode: VoucherUseMode) {
    if (mode === "pos_pickup_now") { setPosVoucher(voucher); setVoucherToUse(null); return; }
    setSelectedVoucher(toSelectedCustomerVoucher(voucher, mode));
    router.push("/");
  }

  function startUsingVoucher(voucher: CustomerVoucher) {
    const channels = voucher.channels?.length ? voucher.channels : ["pos_pickup_now", "web_pickup_later", "web_delivery"];
    const canUseAtStore = channels.includes("pos_pickup_now");
    const canUseOnline = channels.includes("web_pickup_later") || channels.includes("web_delivery");
    if (canUseAtStore && !canUseOnline) { setPosVoucher(voucher); return; }
    if (canUseOnline && !canUseAtStore) { useVoucher(voucher, getDefaultVoucherUseMode(voucher, deliveryMode)); return; }
    setVoucherToUse(voucher);
  }

  return <>
    <section>
      <header><h2 className="text-base font-black text-[#542413]">Voucher của bạn</h2><p className="mt-1 text-[11px] text-[#7b6254]">Chạm vào voucher để chọn cách sử dụng</p></header>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{vouchers.map((voucher) => <VoucherCard key={voucher.id} voucher={voucher} onUse={startUsingVoucher} />)}</div>
    </section>
    <VoucherUseModeSheet voucher={voucherToUse} onClose={() => setVoucherToUse(null)} onSelect={useVoucher} />
    {posVoucher?.code && <PosVoucherModal voucher={posVoucher} customer={data.customer} onClose={() => setPosVoucher(null)} />}
  </>;
}

function VoucherCard({ voucher, onUse }: { voucher: MyRewardsData["vouchers"][number]; onUse: (voucher: CustomerVoucher) => void }) {
  const usable = Boolean(voucher.unlocked && voucher.code && voucher.discountType);
  const value = voucher.discountValue ? `${voucher.discountValue}${voucher.discountType === "percent" ? "%" : "K"}` : "Ưu đãi";
  return <article className={`relative flex min-h-[124px] overflow-hidden rounded-2xl bg-[#fffaf6] ring-1 ${usable ? "ring-[#efc79e]" : "ring-[#efdfcf] opacity-60"}`}>
    <div className={`relative flex w-[92px] shrink-0 flex-col items-center justify-center px-2 text-center ${usable ? "bg-[#fff3df] text-[#c35847]" : "bg-[#f7eee7] text-[#9a7462]"}`}>
      {usable ? <TicketPercent className="h-4 w-4" /> : <Lock className="h-4 w-4" />}<strong className="mt-1 text-xl font-black leading-none">{value}</strong><span className="mt-1 text-[8px] font-black uppercase tracking-widest">Voucher</span>
      <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-[#fffaf5]" /><span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-[#fffaf5]" />
    </div>
    <div className="relative flex min-w-0 flex-1 flex-col p-3.5"><Scissors className="absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#efc79e]" /><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-xs font-black leading-4 text-[#542413]">{voucher.title}</h3><span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black ${usable ? "bg-[#ffe2df] text-[#c35847]" : "bg-[#f7eee7] text-[#9a7462]"}`}>{usable ? "CÓ THỂ DÙNG" : "ĐANG KHÓA"}</span></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#7b6254]">{voucher.description}</p><div className="mt-auto flex items-end justify-between gap-2 pt-2"><span className="truncate font-mono text-[9px] font-bold tracking-wide text-[#b98770]">{voucher.code ?? "SWEET MEMBER"}</span><button type="button" disabled={!usable} onClick={() => onUse(voucher)} className="h-7 shrink-0 rounded-full bg-[#c35847] px-3 text-[9px] font-black text-white disabled:bg-[#f0e3d3] disabled:text-[#9a7462]">Dùng ngay</button></div></div>
  </article>;
}

function PosVoucherModal({ voucher, customer, onClose }: { voucher: CustomerVoucher; customer: MyRewardsData["customer"]; onClose: () => void }) {
  const [qrData] = useState(() => createPosVoucherToken({ voucherId: voucher.id, code: voucher.code ?? "", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone }));
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-[#3d2417]/60 p-4 backdrop-blur-sm"><div className="relative w-full max-w-xs rounded-2xl bg-[#fffaf6] p-5 text-center shadow-2xl"><button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f7eee7] text-[#7b6254]"><X className="h-3.5 w-3.5" /></button><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#c35847] text-white"><QrCode className="h-5 w-5" /></div><h2 className="mt-3 text-base font-black text-[#542413]">Quét mã tại quầy</h2><p className="mt-1 text-[11px] text-[#7b6254]">Đưa mã này cho nhân viên để áp dụng ưu đãi.</p><img src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(qrData)}`} alt={`QR voucher ${voucher.code}`} className="mx-auto mt-4 h-[190px] w-[190px] rounded-xl border border-[#efdfcf] bg-white p-2" /><p className="mt-3 rounded-lg bg-[#fff3df] py-2 text-base font-black tracking-wider text-[#c35847]">{voucher.code}</p></div></div>;
}
