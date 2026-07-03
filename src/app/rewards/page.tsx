"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Gift,
  Info,
  Loader2,
  Lock,
  Ticket,
  VolumeX,
} from "lucide-react";

type RewardsData = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tier: string;
    tierIcon: string;
  };
  points: {
    current: number;
    totalEarned: number;
    neededForNextTier: number;
    progressPercent: number;
  };
  journey: {
    currentTierId: string;
    nextTierId: string | null;
    tiers: Array<{
      id: string;
      name: string;
      threshold: number;
      icon: string;
      benefit: string;
      unlocked: boolean;
    }>;
  };
  totals: {
    orderCount: number;
    lifetimeValue: number;
    favoriteProduct: string;
    favoriteQuantity: number;
  };
  vouchers: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }>;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export default function RewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [activeTab, setActiveTab] = useState<"journey" | "offers">("journey");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRewards() {
      try {
        const response = await fetch("/api/rewards");

        if (response.status === 401) {
          window.location.href = "/account/login?next=/rewards";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load rewards");
        }

        setData(await response.json());
      } catch (err) {
        console.error("Failed to load rewards:", err);
        setError("Không thể tải trang tích điểm");
      } finally {
        setIsLoading(false);
      }
    }

    loadRewards();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fff8e9] pt-6 pb-28 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#7a351f]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Đang mở hành trình hảo ngọt...</span>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#fff8e9] pt-6 pb-28 flex items-center justify-center px-4">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-center text-red-700">
          {error || "Không tìm thấy dữ liệu tích điểm"}
        </div>
      </main>
    );
  }

  const topVoucher =
    data.vouchers.find((voucher) => voucher.unlocked) ?? data.vouchers[0];

  return (
    <main className="min-h-screen bg-bg-main pt-6 pb-28 text-text-primary">
      <div className="mx-auto max-w-md px-4 pb-6 md:max-w-3xl">
        <div className="relative overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_top_left,#fff4ca,#fffaf0_45%,#fff7e8)] px-4 pb-5 pt-3 shadow-sm">
          <div className="pointer-events-none absolute -left-10 top-20 text-5xl opacity-20">
            🍰
          </div>
          <div className="pointer-events-none absolute -right-8 top-24 text-5xl opacity-20">
            🥐
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a94d2a] text-white shadow-[0_4px_0_#7a351f]"
              aria-label="Quay lại hồ sơ"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a94d2a] text-white shadow-[0_4px_0_#7a351f]">
                <VolumeX className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a94d2a] text-white shadow-[0_4px_0_#7a351f]">
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>

          <section className="mt-4 grid grid-cols-[90px_1fr] items-center gap-3">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-3 border-[#ffc979] bg-white shadow-inner">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe2bf] text-3xl">
                  🧑‍🍳
                </div>
              </div>
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-3 border-white bg-[#f5a83a] text-white shadow text-xs">
                ✎
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-black uppercase leading-tight tracking-wide text-text-primary">
                {data.customer.name}
              </h1>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-[#f2a38e] bg-[#fff0e9] px-3 py-1.5 text-xs font-bold uppercase text-text-primary">
                <span>{data.customer.tierIcon}</span>
                {data.customer.tier}
              </div>
            </div>
          </section>

          <Link
            href="#vouchers"
            className="mt-4 flex items-center justify-center gap-2 rounded-full border-4 border-[#f7bd47] bg-gradient-to-b from-[#ffe376] to-[#f3a71c] px-4 py-3 text-sm font-black uppercase text-[#74351f] shadow-[0_5px_0_#b56c14]"
          >
            <Ticket className="h-5 w-5" />
            Kho voucher của tôi
          </Link>
        </div>

        <div className="mt-4 rounded-full border border-[#f5d5a6] bg-white p-1.5 shadow-sm">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab("journey")}
              className={`rounded-full px-4 py-3 text-sm font-bold transition ${
                activeTab === "journey"
                  ? "bg-gradient-to-r from-[#5b2b18] to-[#7d3c23] text-white shadow"
                  : "text-[#9a5a34]"
              }`}
            >
              🍰 Hành trình hảo ngọt
            </button>
            <button
              onClick={() => setActiveTab("offers")}
              className={`rounded-full px-4 py-3 text-sm font-bold transition ${
                activeTab === "offers"
                  ? "bg-gradient-to-r from-[#5b2b18] to-[#7d3c23] text-white shadow"
                  : "text-[#9a5a34]"
              }`}
            >
              🎁 Ưu đãi
            </button>
          </div>
        </div>

        {activeTab === "journey" ? (
          <>
            <section className="mt-4 rounded-3xl border-3 border-[#e7ad67] bg-[#fffaf0] p-4 shadow-[0_8px_18px_rgba(122,53,31,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black uppercase text-[#7a351f]">
                    Thành tích 2026
                  </h2>
                  <p className="mt-1.5 text-xs leading-5 text-[#7f4a31]">
                    {data.points.neededForNextTier > 0 ? (
                      <>
                        Cần thêm{" "}
                        <strong className="text-brand-500">
                          {formatNumber(data.points.neededForNextTier)} điểm
                        </strong>{" "}
                        nữa để lên hạng và nhận ưu đãi mới.
                      </>
                    ) : (
                      <>Bạn đã chạm hạng cao nhất trong hành trình hảo ngọt.</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black leading-none text-brand-500">
                    {formatNumber(data.points.current)}
                  </div>
                  <div className="text-sm font-black leading-tight text-text-primary">
                    Điểm
                    <br />
                    Ngọt Ngào
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2.5 rounded-full bg-[#f2d6ad]">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-[#8b3a21] to-[#f0a12d]"
                  style={{ width: `${data.points.progressPercent}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-1.5">
                {data.journey.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`rounded-xl border p-1.5 text-center ${
                      tier.unlocked
                        ? "border-[#f1bd4f] bg-[#fff0be] shadow-inner"
                        : "border-[#edd0aa] bg-white opacity-70"
                    }`}
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#e8b56a] bg-white text-2xl">
                      {tier.icon}
                    </div>
                    <div className="mt-1.5 min-h-8 text-[10px] font-bold leading-tight text-text-primary">
                      {tier.name}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border-3 border-[#f0c47e] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.12)]">
              <div className="mx-auto -mt-7 mb-2 w-fit rounded-lg bg-gradient-to-b from-[#ffd58a] to-[#efa744] px-6 py-1.5 text-center text-sm font-black uppercase text-[#74351f] shadow">
                Tổng giá trị tích lũy
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  icon="🪙"
                  label="Tổng điểm đã tích"
                  value={formatNumber(data.points.totalEarned)}
                  detail="Điểm ngọt"
                />
                <StatCard
                  icon="🏪"
                  label="Số lần ghé tiệm"
                  value={formatNumber(data.totals.orderCount)}
                  detail="Lần mua"
                />
                <StatCard
                  icon="🥐"
                  label="Món ruột của bạn"
                  value={formatNumber(data.totals.favoriteQuantity)}
                  detail={data.totals.favoriteProduct}
                />
              </div>
              <div className="mt-2.5 rounded-xl bg-white/70 px-3 py-2.5 text-center text-xs font-semibold text-[#8b4a2d]">
                Tổng chi tiêu đã ghi nhận:{" "}
                {formatCurrency(data.totals.lifetimeValue)}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border-3 border-[#f0c47e] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.12)]">
              <div className="mx-auto -mt-7 mb-3 w-fit rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-6 py-1.5 text-center text-sm font-black uppercase text-white shadow">
                Bộ sưu tập danh hiệu
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {data.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`rounded-xl border p-2 text-center ${
                      badge.unlocked
                        ? "border-[#f2c15d] bg-white"
                        : "border-neutral-300 bg-neutral-100 text-neutral-500 grayscale"
                    }`}
                  >
                    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-3 border-[#f0c47e] bg-[#fff4d6] text-2xl">
                      {badge.unlocked ? (
                        badge.icon
                      ) : (
                        <Lock className="h-6 w-6" />
                      )}
                    </div>
                    <div
                      className={`mx-auto -mt-2.5 w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase text-white ${badge.unlocked ? "bg-brand-500" : "bg-neutral-400"}`}
                    >
                      {badge.unlocked ? "Đã mở khóa" : "Chưa mở khóa"}
                    </div>
                    <h3 className="mt-2 text-xs font-black text-text-primary">
                      {badge.title}
                    </h3>
                    <p className="mt-0.5 text-[10px] leading-3 text-[#7f4a31]">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section
            id="vouchers"
            className="mt-4 rounded-3xl border-3 border-[#e7ad67] bg-[#fffaf0] p-4 shadow-[0_8px_18px_rgba(122,53,31,0.14)]"
          >
            <h2 className="text-lg font-black uppercase text-[#7a351f]">
              Kho ưu đãi
            </h2>
            <div className="mt-3 space-y-2.5">
              {data.vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`rounded-xl border p-3 ${
                    voucher.unlocked
                      ? "border-[#f0b64d] bg-gradient-to-r from-[#fff5ca] to-white"
                      : "border-neutral-200 bg-neutral-50 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3a71c] text-white">
                      <Gift className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-[#74351f]">
                        {voucher.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#7f4a31]">
                        {voucher.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${voucher.unlocked ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-500"}`}
                    >
                      {voucher.unlocked ? "Dùng được" : "Khóa"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {topVoucher && (
              <div className="mt-3 rounded-xl bg-[#7a351f] px-3 py-2.5 text-center text-xs font-semibold text-white">
                Ưu đãi nổi bật: {topVoucher.title}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border-2 border-[#f0c47e] bg-white p-2 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1c9] text-2xl">
        {icon}
      </div>
      <p className="mt-2 min-h-8 text-[10px] font-semibold leading-4 text-[#7f4a31]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-black text-[#df4d67]">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-bold text-[#74351f]">
        {detail}
      </p>
    </div>
  );
}
