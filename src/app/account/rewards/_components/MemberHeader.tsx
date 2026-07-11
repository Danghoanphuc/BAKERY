"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Ticket,
  X,
  Lock,
  TicketPercent,
  ChevronDown,
  ChevronUp,
  QrCode,
} from "lucide-react";

import { getInitials } from "./rewards-format";
import type { MyRewardsData } from "./types";
import { useVoucherStore } from "@/store/voucherStore";
import {
  toSelectedCustomerVoucher,
  VoucherUseModeSheet,
  type CustomerVoucher,
} from "@/features/vouchers";
import type { VoucherUseMode } from "@/types/voucher";
import { createPosVoucherToken } from "@/lib/pos-voucher-token";

export function MemberHeader({ data }: { data: MyRewardsData }) {
  const router = useRouter();
  const { setSelectedVoucher } = useVoucherStore();
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [voucherToUse, setVoucherToUse] = useState<CustomerVoucher | null>(
    null,
  );
  const [posVoucher, setPosVoucher] = useState<CustomerVoucher | null>(null);
  const unlockedCount = data.vouchers.filter((v) => v.unlocked).length;

  function useVoucher(voucher: CustomerVoucher, mode: VoucherUseMode) {
    if (mode === "pos_pickup_now") {
      setPosVoucher(voucher);
      setVoucherToUse(null);
      return;
    }

    setSelectedVoucher(toSelectedCustomerVoucher(voucher, mode));
    setVoucherToUse(null);
    router.push("/");
  }

  return (
    <>
      <section className="grid grid-cols-[108px_1fr] items-center gap-4">
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
            <span className="text-lg leading-none">
              {data.customer.tierIcon}
            </span>
            <span className="truncate">{data.customer.tier}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsVoucherOpen(!isVoucherOpen)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d29233] bg-[#ffc94d] px-3 text-sm font-black uppercase text-[#74351f] shadow-[0_3px_0_#c88426] active:translate-y-0.5 active:shadow-[0_1px_0_#c88426]"
          >
            <Ticket className="h-4 w-4" />
            Kho voucher ({unlockedCount})
            {isVoucherOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </section>

      {/* Voucher dropdown */}
      {isVoucherOpen && (
        <section className="mt-4 rounded-lg border border-[#e7ba74] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.09)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black uppercase text-[#74351f]">
              Voucher của tôi
            </h2>
            <button
              type="button"
              onClick={() => setIsVoucherOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#f4ebe1] text-[#7a4b31]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto">
            {data.vouchers.map((voucher) => (
              <article
                key={voucher.id}
                className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
                  voucher.unlocked
                    ? "border-[#f0b64d]"
                    : "border-neutral-200 opacity-75"
                }`}
              >
                <div className="flex">
                  <div
                    className={`grid w-14 shrink-0 place-items-center ${
                      voucher.unlocked ? "bg-[#ffc845]" : "bg-neutral-200"
                    }`}
                  >
                    {voucher.unlocked ? (
                      <TicketPercent className="h-5 w-5 text-[#74351f]" />
                    ) : (
                      <Lock className="h-5 w-5 text-neutral-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-black text-[#74351f]">
                        {voucher.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                          voucher.unlocked
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {voucher.unlocked ? "Đã mở" : "Khóa"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#7a4b31]">
                      {voucher.description}
                    </p>
                    {voucher.unlocked &&
                      voucher.code &&
                      voucher.discountType && (
                        <button
                          type="button"
                          onClick={() => setVoucherToUse(voucher)}
                          className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-[#7a351f] text-[11px] font-black text-white"
                        >
                          Sử dụng voucher
                        </button>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <VoucherUseModeSheet
        voucher={voucherToUse}
        onClose={() => setVoucherToUse(null)}
        onSelect={useVoucher}
      />

      {posVoucher && (
        <PosCustomerVoucherModal
          voucher={posVoucher}
          customer={data.customer}
          onClose={() => setPosVoucher(null)}
        />
      )}
    </>
  );
}

function PosCustomerVoucherModal({
  voucher,
  customer,
  onClose,
}: {
  voucher: CustomerVoucher;
  customer: MyRewardsData["customer"];
  onClose: () => void;
}) {
  const [qrData] = useState(() =>
    createPosVoucherToken({
      voucherId: voucher.id,
      code: voucher.code ?? "",
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
    }),
  );

  if (!voucher.code) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#fff8ef] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#f0e1d2] bg-white p-5 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#b84a39] text-white">
          <QrCode className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-black text-[#3d2417]">
          Đưa mã này cho nhân viên quét
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6254]">
          POS sẽ tự nhận diện {customer.name}, số {customer.phone} và áp voucher.
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`}
          alt={`QR voucher ${voucher.code}`}
          className="mx-auto mt-5 h-[220px] w-[220px] rounded-lg border border-[#eadbcc] bg-white p-3"
        />
        <div className="mt-4 rounded-lg bg-[#fff4ec] px-3 py-2 text-2xl font-black tracking-[0.08em] text-[#3d2417]">
          {voucher.code}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-lg border border-[#eadbcc] text-sm font-black text-[#3d2417]"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
