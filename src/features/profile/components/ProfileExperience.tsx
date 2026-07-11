"use client";

import Link from "next/link";
import {
  Bell,
  Camera,
  ChevronRight,
  Crown,
  Home,
  LogOut,
  MapPinHouse,
  MessageCircle,
  QrCode,
  Settings,
  ShieldCheck,
  Star,
  TicketPercent,
} from "lucide-react";
import type { Customer } from "@/types";

type ProfileExperienceData = {
  customer: Customer;
  rewards: {
    points: {
      current: number;
      neededForNextTier: number;
      progressPercent: number;
    };
    journey: {
      currentTier: {
        id: string;
        name: string;
        threshold: number;
        icon: string;
        benefit: string;
      };
      nextTier: {
        id: string;
        name: string;
        threshold: number;
        icon: string;
        benefit: string;
      } | null;
    };
    totals: {
      orderCount: number;
      lifetimeValue: number;
      favoriteProduct: string;
      favoriteQuantity: number;
    };
  };
  profile: {
    hasBirthday: boolean;
    hasDeliveryAddress: boolean;
    isZaloLinked: boolean;
    isPhoneVerified: boolean;
    unlockedVoucherCount: number;
  };
};

interface ProfileExperienceProps {
  data: ProfileExperienceData;
}

export function ProfileExperience({ data }: ProfileExperienceProps) {
  const { customer, rewards, profile } = data;

  return (
    <main className="min-h-screen bg-[#fff8ef] text-[#3b170c]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[linear-gradient(180deg,#fff3e5_0%,#fff9f0_42%,#fffdf8_100%)] pb-28 shadow-[0_0_50px_rgba(96,42,12,0.08)]">
        <ProfileHero
          customer={customer}
          isPhoneVerified={profile.isPhoneVerified}
        />
        <div className="-mt-3 space-y-4 px-4">
          <MemberCard rewards={rewards} />
          <ShortcutGrid data={data} />
          <GiftBanner
            hasBirthday={profile.hasBirthday}
            unlockedVoucherCount={profile.unlockedVoucherCount}
          />
          <ProfileMenu data={data} />
        </div>
      </div>
    </main>
  );
}

function ProfileHero({
  customer,
  isPhoneVerified,
}: {
  customer: Customer;
  isPhoneVerified: boolean;
}) {
  const birthday = customer.personalization.birthday;

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#ffd9a8_0%,#fff4e7_36%,#fff8ef_76%)]" />
      <div className="absolute -right-10 top-8 h-36 w-36 rounded-full bg-[#f5b7aa]/40 blur-2xl" />
      <div className="relative z-10">
        <button
          type="button"
          aria-label="Thông báo"
          className="absolute right-0 top-12 grid h-9 w-9 place-items-center rounded-full text-[#713719] transition active:scale-95"
        >
          <Bell className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full border-[4px] border-white bg-[#8a4a28] text-[24px] font-black uppercase text-white shadow-[0_8px_18px_rgba(83,38,12,0.15)]">
              {getInitials(customer.name)}
            </div>
            <Link
              href="/account"
              aria-label="Cập nhật ảnh đại diện"
              className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-3 border-white bg-[#df6d7a] text-white shadow-md"
            >
              <Camera className="h-4 w-4" />
            </Link>
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <h1 className="truncate text-[20px] font-black leading-tight tracking-[0] text-[#3b170c]">
              {customer.name}
            </h1>
            <p className="mt-1.5 text-[14px] font-semibold text-[#3b170c]">
              {maskPhone(customer.phone)}
            </p>
            <Link
              href={isPhoneVerified ? "/profile" : "/account"}
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/78 px-2 py-0.5 text-[11px] font-semibold ${
                isPhoneVerified ? "text-[#34802f]" : "text-[#a35421]"
              }`}
            >
              <ShieldCheck
                className={`h-3 w-3 ${
                  isPhoneVerified
                    ? "fill-[#4a9c3d] text-[#4a9c3d]"
                    : "text-[#a35421]"
                }`}
              />
              {isPhoneVerified
                ? "Số điện thoại đã xác minh"
                : "Xác minh số điện thoại"}
            </Link>
            <p className="mt-2 text-[13px] font-medium text-[#3b170c]">
              {birthday ? `Ngày sinh ${birthday}` : "Chưa cập nhật ngày sinh"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberCard({
  rewards,
}: {
  rewards: ProfileExperienceData["rewards"];
}) {
  const { currentTier, nextTier } = rewards.journey;

  return (
    <section className="relative overflow-hidden rounded-[22px] border-2 border-white bg-[#fff4df]/88 p-4 shadow-[0_12px_28px_rgba(83,38,12,0.13)]">
      <div className="absolute inset-y-0 left-[49%] w-px rotate-[-28deg] bg-[#e8c9a9]" />
      <div className="grid grid-cols-[1.08fr_0.92fr] gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full bg-[#ffdca8] text-[28px] shadow-inner">
              {currentTier.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#7b4b34]">
                Hạng thành viên
              </p>
              <p className="mt-0.5 flex items-center gap-0.5 text-[18px] font-black leading-tight text-[#a35421]">
                {currentTier.name}
                <Crown className="h-4 w-4 fill-[#b66a20] text-[#b66a20]" />
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-[#7b4b34]">
            {nextTier
              ? `Còn ${formatNumber(rewards.points.neededForNextTier)} điểm để lên hạng`
              : "Bạn đang ở hạng cao nhất"}
          </p>
          <p className="text-[13px] font-bold text-[#5a2a16]">
            {nextTier?.name ?? currentTier.benefit}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#f9d6b5]">
            <div
              className="h-full rounded-full bg-[#db6871]"
              style={{ width: `${rewards.points.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="min-w-0 pl-1.5">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#7b4b34]">
            Điểm ngọt ngào
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#c7b5a9] text-[10px] font-bold text-white">
              ?
            </span>
          </p>
          <div className="mt-2.5 flex items-end gap-1.5">
            <span className="text-[32px] font-black leading-none text-[#b84a39]">
              {formatNumber(rewards.points.current)}
            </span>
            <span className="pb-0.5 text-[14px] font-bold text-[#b84a39]">
              điểm
            </span>
          </div>
          <Link
            href="/rewards"
            className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-[#b84a39] px-2.5 text-[14px] font-black text-white shadow-[0_6px_14px_rgba(184,74,57,0.25)]"
          >
            Đổi Voucher Ngay
            <span className="text-lg leading-none">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ShortcutGrid({ data }: { data: ProfileExperienceData }) {
  const shortcuts = [
    {
      title: "Mã QR của tôi",
      subtitle: `${formatNumber(data.rewards.points.current)} điểm`,
      href: "/rewards",
      icon: QrCode,
    },
    {
      title: "Sổ địa chỉ",
      subtitle: data.profile.hasDeliveryAddress
        ? "Đã có địa chỉ nhận"
        : "Thêm nơi nhận bánh",
      href: "/account",
      icon: MapPinHouse,
    },
    {
      title: "Kho voucher",
      subtitle: `${data.profile.unlockedVoucherCount} ưu đãi dùng được`,
      href: "/rewards",
      icon: TicketPercent,
    },
  ];

  return (
    <section className="grid grid-cols-3 gap-2">
      {shortcuts.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            className="flex min-h-[90px] flex-col items-center justify-center rounded-[18px] border border-white bg-white/72 px-1.5 text-center shadow-[0_8px_18px_rgba(83,38,12,0.1)]"
          >
            <Icon className="h-9 w-9 text-[#8a4a28]" />
            <div className="mt-1.5 text-[13px] font-black leading-tight text-[#3b170c]">
              {item.title}
            </div>
            <div className="mt-0.5 text-[10px] font-medium leading-tight text-[#7b6a60]">
              {item.subtitle}
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function GiftBanner({
  hasBirthday,
  unlockedVoucherCount,
}: {
  hasBirthday: boolean;
  unlockedVoucherCount: number;
}) {
  return (
    <Link
      href={hasBirthday ? "/rewards#vouchers" : "/account"}
      className="relative block min-h-[120px] overflow-hidden rounded-[20px] bg-[#ffe1dc] p-5 shadow-[0_8px_20px_rgba(83,38,12,0.08)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,#ffc9be_0%,#ffe1dc_42%,#fff0e8_100%)]" />
      <div className="absolute right-4 top-4 grid h-20 w-20 place-items-center rounded-full bg-white/55 text-[34px]">
        {hasBirthday ? "🎁" : "🎂"}
      </div>
      <div className="relative z-10 max-w-[62%]">
        <p className="text-[17px] font-semibold text-[#9b5d55]">
          {hasBirthday ? "Ưu đãi của bạn" : "Hoàn thiện hồ sơ"}
        </p>
        <p className="font-serif text-[28px] italic leading-none text-[#c56b73]">
          {hasBirthday ? `${unlockedVoucherCount} voucher` : "Nhận quà"}
        </p>
        <p className="mt-3 text-[12px] leading-snug text-[#7b4b45]">
          {hasBirthday
            ? "Mở kho ưu đãi đã cá nhân hóa cho bạn"
            : "Thêm ngày sinh để mở khóa quà sinh nhật"}
        </p>
        <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[11px] bg-[#b84a39] px-4 text-[12px] font-black text-white">
          {hasBirthday ? "Xem ngay" : "Cập nhật"}
          <span className="text-lg leading-none">→</span>
        </span>
      </div>
    </Link>
  );
}

function ProfileMenu({ data }: { data: ProfileExperienceData }) {
  const menuItems = [
    {
      title: "Hệ thống cửa hàng",
      subtitle: "Tìm cửa hàng gần bạn nhất",
      href: "/search",
      icon: Home,
      accessory: "chevron",
    },
    {
      title: "Chính sách thành viên",
      subtitle: data.rewards.journey.nextTier
        ? `Hạng kế tiếp: ${data.rewards.journey.nextTier.name}`
        : "Bạn đã mở khóa hạng cao nhất",
      href: "/rewards",
      icon: Star,
      accessory: "chevron",
    },
    {
      title: "Chat với cửa hàng",
      subtitle: data.profile.isZaloLinked
        ? "Hỗ trợ nhanh qua Zalo OA"
        : "Liên kết Zalo để được hỗ trợ nhanh",
      href: data.profile.isZaloLinked ? "/profile" : "/auth/zalo",
      icon: MessageCircle,
      accessory: data.profile.isZaloLinked ? "zalo" : "chevron",
    },
    {
      title: "Cài đặt thông báo",
      subtitle: data.profile.isZaloLinked
        ? "Thông báo ưu đãi qua Zalo đã sẵn sàng"
        : "Cần liên kết Zalo để nhận ưu đãi",
      href: data.profile.isZaloLinked ? "/profile" : "/auth/zalo",
      icon: Bell,
      accessory: "chevron",
    },
    {
      title: "Quản lý tài khoản",
      subtitle: getAccountSummary(data.customer),
      href: "/account",
      icon: Settings,
      accessory: "chevron",
    },
  ];

  return (
    <section>
      <h2 className="mb-2.5 text-[17px] font-black tracking-[0] text-[#3b170c]">
        Khám phá tiệm bánh
      </h2>
      <div className="overflow-hidden rounded-[16px] bg-white/78 shadow-[0_8px_20px_rgba(83,38,12,0.08)]">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              href={item.href}
              className="flex min-h-[54px] items-center gap-3 border-b border-[#f2e5dc] px-4 last:border-b-0"
            >
              <Icon className="h-7 w-7 shrink-0 text-[#8a4a28]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-black leading-tight text-[#3b170c]">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-[#7b6a60]">
                  {item.subtitle}
                </span>
              </span>
              {item.accessory === "zalo" ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eff6ff] text-[10px] font-black text-[#1474ff]">
                  Zalo
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-[#8b776b]" />
              )}
            </Link>
          );
        })}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex min-h-[54px] w-full items-center gap-3 px-4 text-left"
          >
            <LogOut className="h-7 w-7 shrink-0 text-[#df5a67]" />
            <span className="min-w-0 flex-1 text-[14px] font-black text-[#df5a67]">
              Đăng xuất
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#8b776b]" />
          </button>
        </form>
      </div>
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("");
}

function getAccountSummary(customer: Customer) {
  const hasDeliveryAddress = Boolean(
    customer.personalization.defaultDeliveryAddress ||
      customer.personalization.addressBook?.length,
  );
  const missing = [
    customer.email ? "" : "email",
    customer.personalization.birthday ? "" : "ngày sinh",
    hasDeliveryAddress ? "" : "địa chỉ",
  ].filter(Boolean);

  if (!missing.length) return "Thông tin hồ sơ đã đầy đủ";
  return `Thiếu ${missing.join(", ")}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;

  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}
