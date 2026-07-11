import Link from "next/link";
import { Gift, Lock, TicketPercent } from "lucide-react";

import type { MyRewardsData } from "./types";

export function OffersView({
  vouchers,
}: {
  vouchers: MyRewardsData["vouchers"];
}) {
  return (
    <section className="mt-4 rounded-lg border border-[#e7ba74] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase text-[#74351f]">
            Voucher của tôi
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#7a4b31]">
            Ưu đãi gắn với số điện thoại của bạn.
          </p>
        </div>
        <Gift className="h-6 w-6 text-[#b84a39]" />
      </div>

      <div className="mt-4 space-y-2.5">
        {vouchers.map((voucher) => (
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
                className={`grid w-16 shrink-0 place-items-center ${
                  voucher.unlocked ? "bg-[#ffc845]" : "bg-neutral-200"
                }`}
              >
                {voucher.unlocked ? (
                  <TicketPercent className="h-6 w-6 text-[#74351f]" />
                ) : (
                  <Lock className="h-6 w-6 text-neutral-500" />
                )}
              </div>
              <div className="min-w-0 flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-[#74351f]">
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
                <p className="mt-1 text-xs font-semibold leading-5 text-[#7a4b31]">
                  {voucher.description}
                </p>
                {voucher.unlocked && (
                  <Link
                    href="/account/rewards"
                    className="mt-3 flex h-9 items-center justify-center rounded-lg bg-[#7a351f] text-xs font-black text-white"
                  >
                    Sử dụng ngay
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
