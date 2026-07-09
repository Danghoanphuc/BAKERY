import type { ReactNode } from "react";
import { Award, Lock, Star, Trophy } from "lucide-react";

import { currentYear, formatCurrency, formatNumber } from "./rewards-format";
import type { MyRewardsData } from "./types";

export function JourneyView({
  data,
  unlockedVoucherCount,
}: {
  data: MyRewardsData;
  unlockedVoucherCount: number;
}) {
  return (
    <>
      <section className="mt-4 rounded-lg border border-[#e7ba74] bg-[#fffaf0] p-4 shadow-[0_8px_18px_rgba(122,53,31,0.10)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black uppercase tracking-wide text-[#74351f]">
              Thành tích {currentYear}
            </h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#7a4b31]">
              {data.points.neededForNextTier > 0 ? (
                <>
                  Cần thêm{" "}
                  <span className="font-black text-[#df4d67]">
                    {formatNumber(data.points.neededForNextTier)} điểm
                  </span>{" "}
                  để lên hạng và nhận thêm voucher.
                </>
              ) : (
                "Bạn đang ở hạng cao nhất của hành trình hiện tại."
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-4xl font-black leading-none text-[#df4d67]">
              {formatNumber(data.points.current)}
            </div>
            <div className="mt-1 text-sm font-black leading-4 text-[#74351f]">
              Điểm
              <br />
              Ngọt Ngào
            </div>
          </div>
        </div>

        <div className="relative mt-6">
          <div className="absolute left-8 right-8 top-7 h-0.5 rounded-full bg-[#d6a36a]" />
          <div
            className="absolute left-8 top-7 h-0.5 rounded-full bg-[#7a351f]"
            style={{
              width: `calc((100% - 64px) * ${
                data.points.progressPercent / 100
              })`,
            }}
          />
          <div className="relative grid grid-cols-4 gap-1">
            {data.journey.tiers.map((tier) => (
              <TierStep key={tier.id} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      <SectionTitle tone="gold">Tổng giá trị tích lũy</SectionTitle>
      <section className="rounded-lg border border-[#e7ba74] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.09)]">
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            icon={<Trophy className="h-7 w-7" />}
            label="Tổng điểm"
            value={formatNumber(data.points.totalEarned)}
            detail="Điểm ngọt"
          />
          <MetricCard
            icon={<Award className="h-7 w-7" />}
            label="Lần ghé tiệm"
            value={formatNumber(unlockedVoucherCount)}
            detail="Lần mua"
          />
          <MetricCard
            icon={<Star className="h-7 w-7" />}
            label="Món ruột"
            value={formatNumber(data.totals.favoriteQuantity)}
            detail={data.totals.favoriteProduct}
          />
        </div>
        <div className="mt-3 rounded-md border border-[#f0d3a8] bg-white/70 px-3 py-2 text-center text-[11px] font-bold text-[#7a4b31]">
          Tổng chi tiêu đã ghi nhận: {formatCurrency(data.totals.lifetimeValue)}
        </div>
      </section>

      <SectionTitle tone="pink">Bộ sưu tập danh hiệu</SectionTitle>
      <section className="rounded-lg border border-[#e7ba74] bg-[#fffaf0] p-3 shadow-[0_8px_18px_rgba(122,53,31,0.09)]">
        <div className="grid grid-cols-3 gap-2">
          {data.badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </section>
    </>
  );
}

function TierStep({
  tier,
}: {
  tier: MyRewardsData["journey"]["tiers"][number];
}) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full border bg-white text-2xl shadow-sm ${
          tier.unlocked ? "border-[#f0b64d]" : "border-[#e5c39a] grayscale"
        }`}
      >
        {tier.icon || <Star className="h-5 w-5" />}
      </div>
      <div className="mt-2 min-h-9 text-[11px] font-bold leading-4 text-[#74351f]">
        {tier.name}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "gold" | "pink";
}) {
  return (
    <div
      className={`mx-auto mt-5 flex h-10 w-[82%] items-center justify-center rounded-md border text-base font-black uppercase shadow-sm ${
        tone === "gold"
          ? "border-[#d5953e] bg-[#ffc36f] text-[#74351f]"
          : "border-[#d77580] bg-[#ed7f8d] text-white"
      }`}
    >
      {children}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-[#f0c47e] bg-white p-2 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fff1d3] text-[#df4d67]">
        {icon}
      </div>
      <p className="mt-2 min-h-8 text-[11px] font-bold leading-4 text-[#7a4b31]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[#df4d67]">{value}</p>
      <p className="mt-1 truncate text-[11px] font-bold text-[#74351f]">
        {detail}
      </p>
    </div>
  );
}

function BadgeCard({ badge }: { badge: MyRewardsData["badges"][number] }) {
  return (
    <div
      className={`rounded-md border bg-white p-2 text-center ${
        badge.unlocked
          ? "border-[#f0c47e]"
          : "border-neutral-300 text-neutral-500 grayscale"
      }`}
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#f4c66f] bg-[#fff1d8] text-2xl">
        {badge.unlocked ? badge.icon : <Lock className="h-6 w-6" />}
      </div>
      <div
        className={`mx-auto -mt-1.5 w-fit rounded-full px-2 py-0.5 text-[9px] font-black text-white ${
          badge.unlocked ? "bg-[#df6b7a]" : "bg-neutral-400"
        }`}
      >
        {badge.unlocked ? "Đã mở" : "Khóa"}
      </div>
      <h3 className="mt-2 text-xs font-black leading-4 text-[#74351f]">
        {badge.title}
      </h3>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#7a4b31]">
        {badge.description}
      </p>
    </div>
  );
}
