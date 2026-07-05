"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Loader2, Star, TicketPercent } from "lucide-react";

type MyRewardsData = {
  customer: {
    name: string;
    phone: string;
    tier: string;
    tierIcon: string;
  };
  points: {
    current: number;
    totalEarned: number;
    neededForNextTier: number;
    progressPercent: number;
  };
  vouchers: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }>;
};

export default function MyRewardsPage() {
  const [data, setData] = useState<MyRewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRewards() {
      const response = await fetch("/api/rewards");
      if (!response.ok) {
        window.location.href = "/account/login?next=/account/rewards";
        return;
      }
      setData(await response.json());
      setIsLoading(false);
    }

    loadRewards();
  }, []);

  if (isLoading || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] text-[#7a4b31]">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang mở điểm thưởng...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-6 text-[#3d2417]">
      <div className="mx-auto w-full max-w-[520px]">
        <section className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          <div className="flex items-start gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#d85d6c] text-2xl text-white">
              {data.customer.tierIcon || <Star className="h-7 w-7" />}
            </span>
            <div>
              <p className="text-sm font-bold text-[#7b6254]">
                {data.customer.phone}
              </p>
              <h1 className="text-2xl font-black">{data.customer.name}</h1>
              <p className="mt-1 text-sm font-black text-[#d85d6c]">
                Hạng {data.customer.tier}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-[#fff4ec] p-4">
            <p className="text-sm font-bold text-[#7b6254]">Điểm hiện có</p>
            <p className="mt-1 text-4xl font-black text-[#d85d6c]">
              {data.points.current.toLocaleString("vi-VN")}
            </p>
            <div className="mt-3 h-2 rounded-full bg-[#f2d6c8]">
              <div
                className="h-2 rounded-full bg-[#d85d6c]"
                style={{ width: `${data.points.progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Gift className="h-5 w-5 text-[#d85d6c]" />
            Voucher của tôi
          </h2>
          <div className="mt-3 space-y-3">
            {data.vouchers.map((voucher) => (
              <article
                key={voucher.id}
                className="rounded-lg border border-[#eadbcc] bg-[#fffaf6] p-3"
              >
                <div className="flex items-start gap-3">
                  <TicketPercent className="mt-0.5 h-5 w-5 text-[#d85d6c]" />
                  <div>
                    <h3 className="font-black">{voucher.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#7b6254]">
                      {voucher.description}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                      {voucher.unlocked ? "Dùng được" : "Chưa mở khóa"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Link
          href="/rewards"
          className="mt-4 flex h-11 items-center justify-center rounded-lg border border-[#eadbcc] bg-white text-sm font-black text-[#3d2417]"
        >
          Xem voucher công khai
        </Link>
      </div>
    </main>
  );
}
