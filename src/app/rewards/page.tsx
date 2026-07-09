"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Gift,
  Loader2,
  MapPin,
  QrCode,
  ShoppingBag,
  TicketPercent,
  X,
} from "lucide-react";

import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import type { PublicVoucher, VoucherUseMode } from "@/types/voucher";
import { toSelectedVoucher } from "@/lib/vouchers";
import { createPosVoucherToken } from "@/lib/pos-voucher-token";

type RewardsData = {
  customer?: {
    id: string;
    name: string;
    phone: string;
    tier: string;
    tierIcon: string;
  };
  points?: {
    current: number;
    neededForNextTier: number;
    progressPercent: number;
  };
};

function RewardsContent() {
  const router = useRouter();
  const { setDeliveryMode, setOrderTiming } = useOrderConfigStore();
  const { setSelectedVoucher } = useVoucherStore();
  const [publicVouchers, setPublicVouchers] = useState<PublicVoucher[]>([]);
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [selectedVoucher, setSelectedVoucherModal] =
    useState<PublicVoucher | null>(null);
  const [posVoucher, setPosVoucher] = useState<PublicVoucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRewards() {
      try {
        const [publicRes, privateRes] = await Promise.all([
          fetch("/api/vouchers/public"),
          fetch("/api/rewards"),
        ]);

        if (publicRes.ok) {
          const data = await publicRes.json();
          setPublicVouchers(data.vouchers ?? []);
        }

        // If logged in, always redirect to account rewards (ignore forcePublic)
        if (privateRes.ok) {
          setRewardsData(await privateRes.json());
          router.replace("/account/rewards");
          return;
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadRewards();
  }, [router]);

  const heroVoucher = useMemo(
    () => publicVouchers[0] ?? null,
    [publicVouchers],
  );

  function useVoucher(voucher: PublicVoucher, useMode: VoucherUseMode) {
    if (useMode === "pos_pickup_now") {
      setPosVoucher(voucher);
      setSelectedVoucherModal(null);
      return;
    }

    setSelectedVoucher(toSelectedVoucher(voucher, useMode));
    setDeliveryMode(useMode === "web_delivery" ? "delivery" : "pickup");
    if (useMode === "web_pickup_later") {
      setOrderTiming({ type: "scheduled" });
    }
    router.push("/");
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] text-[#7a4b31]">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang mở kho ưu đãi...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-28 text-[#3d2417]">
      <section className="mx-auto w-full max-w-[520px] px-4 pt-6">
        <div className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#d85d6c] text-white">
              <Gift className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-[#d85d6c]">
                Voucher công khai
              </p>
              <h1 className="mt-1 text-[28px] font-black leading-tight">
                Quét bill, nhận ưu đãi cho lần mua sau
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6254]">
                Khi dùng voucher, bạn chỉ cần nhập số điện thoại để tiệm kiểm
                tra ưu đãi.
              </p>
            </div>
          </div>

          {rewardsData?.customer && (
            <div className="mt-4 rounded-lg bg-[#fff4ec] px-3 py-2 text-sm font-bold text-[#7a4b31]">
              Xin chào {rewardsData.customer.name}. Bạn đang có{" "}
              {rewardsData.points?.current ?? 0} điểm.
            </div>
          )}
        </div>

        {heroVoucher && (
          <VoucherCard
            voucher={heroVoucher}
            featured
            onUse={() => setSelectedVoucherModal(heroVoucher)}
          />
        )}

        {!heroVoucher && rewardsData?.customer && (
          <div className="mt-4 rounded-lg border border-[#f0e1d2] bg-white p-5 text-center shadow-[0_12px_26px_rgba(83,38,12,0.08)]">
            <h2 className="text-lg font-black text-[#3d2417]">
              Ưu đãi này đã nằm trong kho của bạn
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6254]">
              Bạn đang đăng nhập, nên tiệm đã chuyển voucher phù hợp vào kho cá
              nhân để quản lý và sử dụng dễ hơn.
            </p>
            <button
              type="button"
              onClick={() => router.push("/account/rewards")}
              className="mt-4 h-11 rounded-lg bg-[#d85d6c] px-5 text-sm font-black text-white"
            >
              Mở kho voucher của tôi
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {publicVouchers.slice(heroVoucher ? 1 : 0).map((voucher) => (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              onUse={() => setSelectedVoucherModal(voucher)}
            />
          ))}
        </div>
      </section>

      {selectedVoucher && (
        <UseVoucherModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucherModal(null)}
          onUse={useVoucher}
        />
      )}

      {posVoucher && (
        <PosVoucherModal
          voucher={posVoucher}
          onClose={() => setPosVoucher(null)}
        />
      )}
    </main>
  );
}

export default function RewardsPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#fff8ef] text-[#7a4b31]">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang mở kho ưu đãi...
          </div>
        </main>
      }
    >
      <RewardsContent />
    </Suspense>
  );
}

function VoucherCard({
  voucher,
  featured,
  onUse,
}: {
  voucher: PublicVoucher;
  featured?: boolean;
  onUse: () => void;
}) {
  return (
    <article
      className={`mt-4 overflow-hidden rounded-lg border bg-white shadow-[0_12px_26px_rgba(83,38,12,0.08)] ${
        featured ? "border-[#f0b64d]" : "border-[#f0e1d2]"
      }`}
    >
      <div className="flex">
        <div className="grid w-24 place-items-center bg-[#d85d6c] text-white">
          <TicketPercent className="h-9 w-9" />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <p className="text-xs font-black uppercase text-[#d85d6c]">
            {voucher.code}
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight">
            {voucher.title}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#7b6254]">
            {voucher.description}
          </p>
          <button
            type="button"
            onClick={onUse}
            className="mt-3 h-10 rounded-lg bg-[#d85d6c] px-4 text-sm font-black text-white"
          >
            Sử dụng ngay
          </button>
        </div>
      </div>
    </article>
  );
}

function UseVoucherModal({
  voucher,
  onClose,
  onUse,
}: {
  voucher: PublicVoucher;
  onClose: () => void;
  onUse: (voucher: PublicVoucher, mode: VoucherUseMode) => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#3d2417]">
              Bạn muốn dùng voucher ở đâu?
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#7b6254]">
              {voucher.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#fff4ec]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <ModeButton
            icon={<MapPin className="h-5 w-5" />}
            title="Dùng tại quầy"
            description="Đang ở tiệm? Hiện mã để nhân viên quét và giảm trực tiếp."
            onClick={() => onUse(voucher, "pos_pickup_now")}
          />
          <ModeButton
            icon={<ShoppingBag className="h-5 w-5" />}
            title="Đặt trước, đến lấy"
            description="Chọn bánh trên web, hẹn giờ chuẩn bị rồi ghé lấy sau."
            onClick={() => onUse(voucher, "web_pickup_later")}
          />
          <ModeButton
            icon={<Bike className="h-5 w-5" />}
            title="Giao tận nơi"
            description="Đặt bánh giao về nhà như bình thường."
            onClick={() => onUse(voucher, "web_delivery")}
          />
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border border-[#eadbcc] bg-[#fffaf6] p-3 text-left transition active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[#d85d6c]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-black text-[#3d2417]">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-[#7b6254]">
          {description}
        </span>
      </span>
    </button>
  );
}

function PosVoucherModal({
  voucher,
  onClose,
}: {
  voucher: PublicVoucher;
  onClose: () => void;
}) {
  const [qrData] = useState(() =>
    createPosVoucherToken({ voucherId: voucher.id, code: voucher.code }),
  );

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#fff8ef] p-4">
      <div className="w-full max-w-sm rounded-lg border border-[#f0e1d2] bg-white p-5 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[#d85d6c] text-white">
          <QrCode className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-black text-[#3d2417]">
          Đưa mã này cho nhân viên quét
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#7b6254]">
          Voucher: {voucher.title}
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`}
          alt={`QR voucher ${voucher.code}`}
          className="mx-auto mt-5 h-[220px] w-[220px] rounded-lg border border-[#eadbcc] bg-white p-3"
        />
        <div className="mt-4 rounded-lg bg-[#fff4ec] px-3 py-2 text-2xl font-black tracking-[0.08em] text-[#3d2417]">
          {voucher.code}
        </div>
        <p className="mt-2 text-xs font-semibold text-[#7b6254]">
          Nhân viên nhập mã này ở trang Quét voucher tại quầy.
        </p>
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
