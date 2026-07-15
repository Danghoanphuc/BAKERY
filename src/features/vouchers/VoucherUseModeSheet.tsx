"use client";

import { ShoppingBag, Store, X } from "lucide-react";

import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { VoucherUseMode } from "@/types/voucher";
import { getDefaultVoucherUseMode, type CustomerVoucher } from "./customer-vouchers";

type VoucherUseModeSheetProps = {
  voucher: CustomerVoucher | null;
  onClose: () => void;
  onSelect: (voucher: CustomerVoucher, mode: VoucherUseMode) => void;
};

export function VoucherUseModeSheet({ voucher, onClose, onSelect }: VoucherUseModeSheetProps) {
  const deliveryMode = useOrderConfigStore((state) => state.config.deliveryMode);
  if (!voucher) return null;

  const channels = voucher.channels?.length ? voucher.channels : ["pos_pickup_now", "web_pickup_later", "web_delivery"];
  const canUseAtStore = channels.includes("pos_pickup_now");
  const canUseOnline = channels.includes("web_pickup_later") || channels.includes("web_delivery");

  return <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[#3d2417]/25 sm:items-center sm:p-4" onClick={onClose}>
    <div className="w-full max-w-sm rounded-t-2xl border border-[#efdfcf] bg-[#fffaf6] p-4 shadow-xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#c35847]">{voucher.code}</p><h2 className="mt-1 text-base font-black text-[#542413]">Bạn muốn dùng voucher thế nào?</h2><p className="mt-1 line-clamp-1 text-[11px] text-[#7b6254]">{voucher.title}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f7eee7] text-[#7b6254]" aria-label="Đóng"><X className="h-3.5 w-3.5" /></button></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {canUseOnline && <button type="button" onClick={() => onSelect(voucher, getDefaultVoucherUseMode(voucher, deliveryMode))} className="flex items-center gap-3 rounded-xl border border-[#efdfcf] bg-white p-3 text-left transition hover:border-[#c35847]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ffe2df] text-[#c35847]"><ShoppingBag className="h-4 w-4" /></span><span><b className="block text-xs text-[#542413]">Mua online</b><small className="mt-0.5 block text-[9px] text-[#7b6254]">Theo lựa chọn giao/nhận hiện tại</small></span></button>}
        {canUseAtStore && <button type="button" onClick={() => onSelect(voucher, "pos_pickup_now")} className="flex items-center gap-3 rounded-xl border border-[#efdfcf] bg-white p-3 text-left transition hover:border-[#c35847]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff3df] text-[#9b3f24]"><Store className="h-4 w-4" /></span><span><b className="block text-xs text-[#542413]">Dùng tại quầy</b><small className="mt-0.5 block text-[9px] text-[#7b6254]">Hiện QR để nhân viên quét</small></span></button>}
      </div>
      {voucher.minOrderValue ? <p className="mt-3 text-[9px] text-[#7b6254]">Áp dụng cho đơn từ {voucher.minOrderValue.toLocaleString("vi-VN")}₫</p> : null}
    </div>
  </div>;
}
