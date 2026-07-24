"use client";

import { useMemo, useState } from "react";
import { Check, ShoppingBag, TicketPercent } from "lucide-react";
import {
  channelLabels,
  discountTypeLabels,
  formatCurrency,
  getDiscountPreview,
  type VoucherDraft,
} from "@/app/wholesale/vouchers/_lib/voucher-admin";

type PreviewMode = "voucher" | "order";

export function VoucherCompactPreview({ draft }: { draft: VoucherDraft }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#efcfaa] bg-white shadow-[0_14px_32px_rgba(83,38,12,0.1)]">
      <div className="flex min-h-28">
        <div className="relative grid w-24 shrink-0 place-items-center bg-[#b84a39] px-3 text-center text-white">
          <div>
            <TicketPercent className="mx-auto h-5 w-5 text-[#ffe4c7]" />
            <p className="mt-2 text-xl font-black leading-tight">{primaryOffer(draft)}</p>
          </div>
          <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-[#fffaf6]" />
          <span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-[#fffaf6]" />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-black leading-5 text-[#3d2417]">{draft.name || "Ưu đãi đặc biệt"}</p>
            <span className="shrink-0 rounded-md bg-[#fff3df] px-2 py-1 font-mono text-[10px] font-black text-[#9e3e2f]">{draft.code || "VOUCHER"}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#7b6254]">{draft.customerDescription || offerDescription(draft)}</p>
          <p className="mt-2 text-[10px] font-black text-[#9e3e2f]">Đơn từ {formatCurrency(draft.minOrderValue)}</p>
        </div>
      </div>
    </div>
  );
}

export function VoucherCustomerPreview({ draft }: { draft: VoucherDraft }) {
  const [mode, setMode] = useState<PreviewMode>("voucher");
  const sampleSubtotal = Math.max(100_000, draft.minOrderValue);
  const pricing = useMemo(() => getDiscountPreview(sampleSubtotal, draft), [draft, sampleSubtotal]);

  return (
    <section className="rounded-2xl border border-[#f0e1d2] bg-[#fffaf6] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9e3e2f]">Preview khách hàng</p>
          <p className="mt-1 text-sm font-semibold text-[#7b6254]">Gần giống giao diện khách sẽ sử dụng thực tế.</p>
        </div>
        <div className="flex rounded-xl border border-[#ead8c7] bg-white p-1 text-xs font-black">
          <PreviewTab active={mode === "voucher"} onClick={() => setMode("voucher")}>Thẻ voucher</PreviewTab>
          <PreviewTab active={mode === "order"} onClick={() => setMode("order")}>Áp vào đơn</PreviewTab>
        </div>
      </div>

      <div className="mt-5">
        {mode === "voucher" ? (
          <VoucherFace draft={draft} />
        ) : (
          <OrderPreview draft={draft} subtotal={sampleSubtotal} discount={pricing.discountAmount} total={pricing.totalAfterDiscount} />
        )}
      </div>
    </section>
  );
}

function PreviewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 transition ${active ? "bg-[#b84a39] text-white shadow-sm" : "text-[#7b6254] hover:bg-[#fff7f2]"}`}>
      {children}
    </button>
  );
}

function VoucherFace({ draft }: { draft: VoucherDraft }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#efcfaa] bg-white shadow-[0_18px_42px_rgba(83,38,12,0.12)]">
      <div className="grid sm:grid-cols-[148px_minmax(0,1fr)]">
        <div className="relative flex min-h-40 flex-col items-center justify-center bg-[#b84a39] p-6 text-center text-white">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><TicketPercent className="h-6 w-6" /></span>
          <p className="mt-4 text-3xl font-black leading-none">{primaryOffer(draft)}</p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe4c7]">Ưu đãi của tiệm</p>
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#fffaf6]" />
          <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-[#fffaf6]" />
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b84a39]">D Bakery · Voucher dành cho bạn</p>
              <h3 className="mt-2 text-xl font-black leading-tight text-[#3d2417]">{draft.name || "Ưu đãi đặc biệt"}</h3>
            </div>
            <span className="rounded-lg border border-dashed border-[#d9a679] bg-[#fff8ef] px-3 py-2 font-mono text-xs font-black tracking-wider text-[#9e3e2f]">{draft.code || "VOUCHER"}</span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#7b6254]">{draft.customerDescription || offerDescription(draft)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[#69483a]">
            {draft.minOrderValue > 0 && <Tag>Đơn từ {formatCurrency(draft.minOrderValue)}</Tag>}
            {draft.discountType === "percent" && draft.maxDiscountAmount > 0 && <Tag>Tối đa {formatCurrency(draft.maxDiscountAmount)}</Tag>}
            <Tag>Hiệu lực {draft.validDaysAfterIssue} ngày</Tag>
          </div>
          <div className="mt-5 border-t border-dashed border-[#ead8c7] pt-4">
            <p className="text-[11px] font-bold leading-5 text-[#8a6b5c]">Dùng tại {draft.channels.map((channel) => channelLabels[channel]).join(" · ")}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderPreview({ draft, subtotal, discount, total }: { draft: VoucherDraft; subtotal: number; discount: number; total: number }) {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#f0e1d2] bg-white shadow-[0_18px_42px_rgba(83,38,12,0.1)]">
      <div className="flex items-center gap-3 border-b border-[#f3e7dc] p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0d2] text-[#9e3e2f]"><ShoppingBag className="h-5 w-5" /></span>
        <div><p className="font-black text-[#3d2417]">Đơn hàng mẫu</p><p className="text-xs font-semibold text-[#8a6b5c]">Kiểm tra tác động trước khi phát hành</p></div>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <PriceLine label="Tạm tính" value={formatCurrency(subtotal)} />
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fff7f2] px-3 py-3 text-[#9e3e2f]">
          <span className="flex min-w-0 items-center gap-2 font-black"><TicketPercent className="h-4 w-4 shrink-0" /><span className="truncate">{draft.code || "VOUCHER"}</span></span>
          <span className="shrink-0 font-black">-{formatCurrency(discount)}</span>
        </div>
        <div className="border-t border-dashed border-[#ead8c7] pt-4"><PriceLine label="Khách cần trả" value={formatCurrency(total)} strong /></div>
        <p className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Check className="h-4 w-4" /> Đơn hàng đủ điều kiện áp dụng voucher</p>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#fff3df] px-2.5 py-1.5">{children}</span>;
}

function PriceLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? "text-base font-black text-[#3d2417]" : "font-semibold text-[#7b6254]"}`}><span>{label}</span><span>{value}</span></div>;
}

function primaryOffer(draft: VoucherDraft) {
  if (draft.discountType === "percent") return `-${draft.discountValue}%`;
  if (draft.discountType === "amount") return `-${formatCurrency(draft.discountValue)}`;
  return discountTypeLabels[draft.discountType];
}

function offerDescription(draft: VoucherDraft) {
  if (draft.discountType === "percent") return `Giảm ${draft.discountValue}% cho đơn hàng đủ điều kiện.`;
  if (draft.discountType === "amount") return `Giảm ngay ${formatCurrency(draft.discountValue)} cho đơn hàng đủ điều kiện.`;
  return discountTypeLabels[draft.discountType];
}
