"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Gift,
  Heart,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import {
  emptyPosDisplaySnapshot,
  PosDisplaySnapshot,
  subscribePosDisplaySnapshot,
} from "@/store/posDisplayStore";
import { formatCurrency } from "../../_lib/pos-utils";

const statusCopy = {
  idle: {
    label: "Sẵn sàng phục vụ",
    title: "Chào mừng bạn đến với tiệm bánh",
    description: "Món bạn chọn sẽ xuất hiện tại đây để mình cùng kiểm tra đơn.",
  },
  editing: {
    label: "Đang chọn món",
    title: "Đơn của bạn đang được chuẩn bị",
    description: "Bạn có thể kiểm tra số lượng, biến thể và tổng tiền ngay trên màn hình này.",
  },
  awaiting_payment: {
    label: "Chờ thanh toán",
    title: "Vui lòng kiểm tra tổng tiền",
    description: "Nhân viên sẽ hỗ trợ thanh toán theo phương thức bạn đã chọn.",
  },
  paid: {
    label: "Đã thanh toán",
    title: "Thanh toán thành công",
    description: "Cảm ơn bạn, đơn hàng đang được hoàn tất.",
  },
  thank_you: {
    label: "Cảm ơn quý khách",
    title: "Hẹn gặp lại bạn lần sau",
    description: "Đừng quên dùng điểm thưởng và voucher cho lần ghé tiếp theo nhé.",
  },
};

const paymentLabels: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "QR / Chuyển khoản",
  card: "Thẻ",
  wallet: "Ví điện tử",
  other: "Phương thức khác",
};

export function CustomerDisplayShell() {
  const [snapshot, setSnapshot] = useState<PosDisplaySnapshot>(
    emptyPosDisplaySnapshot,
  );

  useEffect(() => subscribePosDisplaySnapshot(setSnapshot), []);

  const featuredItem = useMemo(
    () => snapshot.items[snapshot.items.length - 1] ?? snapshot.items[0],
    [snapshot.items],
  );
  const copy = statusCopy[snapshot.status];
  const hasItems = snapshot.items.length > 0;

  return (
    <main className="fixed inset-0 z-[9999] overflow-hidden bg-[#3d2417] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <HeroPanel
          snapshot={snapshot}
          featuredItem={featuredItem}
          title={featuredItem ? featuredItem.productName : copy.title}
          description={copy.description}
          hasItems={hasItems}
        />
        <OrderPanel snapshot={snapshot} statusLabel={copy.label} />
      </div>
    </main>
  );
}

function HeroPanel({
  snapshot,
  featuredItem,
  title,
  description,
  hasItems,
}: {
  snapshot: PosDisplaySnapshot;
  featuredItem?: PosDisplaySnapshot["items"][number];
  title: string;
  description: string;
  hasItems: boolean;
}) {
  return (
    <section className="relative flex min-h-[46vh] flex-col justify-between overflow-hidden bg-[#4a2b1c] p-8 lg:min-h-screen lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,241,240,0.18),transparent_34%),linear-gradient(145deg,rgba(216,93,108,0.32),transparent_46%)]" />
      {featuredItem?.imageUrl ? (
        <div className="absolute inset-0 opacity-38">
          <ProductImage
            src={featuredItem.imageUrl}
            alt={featuredItem.productName}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#3d2417]/70 via-[#3d2417]/48 to-[#3d2417]/76" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#4a2b1c_0%,#7a3f32_46%,#d85d6c_100%)] opacity-80" />
      )}

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-3xl bg-white text-xl font-black text-[#d85d6c] shadow-2xl">
            B
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">
              Bakery POS
            </p>
            <p className="text-lg font-black">Tiệm bánh của bạn</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-black backdrop-blur md:flex">
          <Sparkles className="h-4 w-4 text-[#ffd4a8]" />
          Bánh tươi mỗi ngày
        </div>
      </div>

      <div className="relative z-10 max-w-2xl py-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-sm font-black text-white backdrop-blur">
          {snapshot.status === "awaiting_payment" ? (
            <CreditCard className="h-4 w-4 text-[#ffd4a8]" />
          ) : snapshot.status === "paid" || snapshot.status === "thank_you" ? (
            <CheckCircle2 className="h-4 w-4 text-[#b8f2c2]" />
          ) : (
            <Heart className="h-4 w-4 text-[#ffd4a8]" />
          )}
          {hasItems ? `${snapshot.items.length} món trong đơn` : "Rất vui được phục vụ bạn"}
        </div>
        <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-normal text-white md:text-7xl">
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-lg font-semibold leading-relaxed text-white/78 md:text-xl">
          {description}
        </p>
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-3">
        <TrustBadge icon={<ReceiptText className="h-5 w-5" />} label="Kiểm đơn rõ ràng" />
        <TrustBadge icon={<Gift className="h-5 w-5" />} label="Tích điểm & voucher" />
        <TrustBadge icon={<Clock3 className="h-5 w-5" />} label="Thanh toán nhanh" />
      </div>
    </section>
  );
}

function OrderPanel({
  snapshot,
  statusLabel,
}: {
  snapshot: PosDisplaySnapshot;
  statusLabel: string;
}) {
  const hasItems = snapshot.items.length > 0;
  const paymentLabel = snapshot.paymentMethod
    ? paymentLabels[snapshot.paymentMethod] ?? "Thanh toán"
    : "Chưa chọn";

  return (
    <section className="flex min-h-screen flex-col bg-[#fffaf6] p-6 text-[#3d2417] lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d85d6c]">
            {statusLabel}
          </p>
          {snapshot.customerName ? (
            <h2 className="mt-1 text-3xl font-black leading-tight">
              Xin chào{" "}
              <span className="font-dancing-script text-5xl uppercase leading-none text-[#d85d6c]">
                {snapshot.customerName.toUpperCase()}
              </span>
            </h2>
          ) : (
            <h2 className="mt-1 text-3xl font-black">Đơn hàng của bạn</h2>
          )}
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-[#f0e1d2]">
          <p className="text-xs font-black text-[#9b8171]">Thanh toán</p>
          <p className="mt-1 text-sm font-black text-[#3d2417]">{paymentLabel}</p>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-[0_18px_46px_rgba(61,36,23,0.10)] ring-1 ring-[#f0e1d2]">
        {hasItems ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-3">
                {snapshot.items.map((item) => (
                  <DisplayLineItem key={item.cartItemId} item={item} />
                ))}
              </div>
            </div>
            <Totals snapshot={snapshot} />
          </div>
        ) : (
          <IdleOrderCard />
        )}
      </div>

      <BottomMessage snapshot={snapshot} />
    </section>
  );
}

function DisplayLineItem({
  item,
}: {
  item: PosDisplaySnapshot["items"][number];
}) {
  const details = [
    item.selectedSize ? `Size ${item.selectedSize}` : null,
    item.selectedFlavor ? `Vị ${item.selectedFlavor}` : null,
    item.customMessage ? `Chữ "${item.customMessage}"` : null,
    item.candles ? `${item.candles} nến` : null,
  ].filter(Boolean);

  return (
    <article className="grid grid-cols-[84px_1fr_auto] gap-4 rounded-2xl border border-[#f0e1d2] bg-[#fffaf6] p-3">
      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#fdf0e7]">
        <ProductImage
          src={item.imageUrl}
          alt={item.productName}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 self-center">
        <h3 className="truncate text-lg font-black text-[#3d2417]">
          {item.productName}
        </h3>
        {details.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#7b6254]">
            {details.join(" / ")}
          </p>
        )}
        <p className="mt-2 text-sm font-black text-[#d85d6c]">
          {formatCurrency(item.price)} x {item.quantity}
        </p>
      </div>
      <div className="self-center text-right">
        <p className="text-xl font-black text-[#3d2417]">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
    </article>
  );
}

function Totals({ snapshot }: { snapshot: PosDisplaySnapshot }) {
  return (
    <div className="border-t border-[#f0e1d2] bg-white p-5">
      <div className="space-y-2 text-base font-bold text-[#7b6254]">
        <TotalRow label="Tạm tính" value={snapshot.subtotal} />
        {snapshot.discountAmount > 0 && (
          <>
            <TotalRow label="Voucher" value={-snapshot.discountAmount} accent />
            {snapshot.voucher && (
              <div className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-black text-[#d85d6c]">
                Đã áp dụng {snapshot.voucher.code} - {snapshot.voucher.title}
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4 rounded-3xl bg-[#9f3f32] px-5 py-5 text-white shadow-[0_18px_34px_rgba(159,63,50,0.24)]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-white/58">
            Khách thanh toán
          </p>
          {snapshot.orderNumber && (
            <p className="mt-2 text-sm font-semibold text-white/70">
              Mã đơn {snapshot.orderNumber}
            </p>
          )}
        </div>
        <p className="text-4xl font-black text-[#ffd4a8] md:text-5xl">
          {formatCurrency(snapshot.totalAmount)}
        </p>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between",
        accent && "text-[#d85d6c]",
      )}
    >
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function IdleOrderCard() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#fff1f0] text-[#d85d6c]">
          <ReceiptText className="h-9 w-9" />
        </div>
        <h3 className="mt-5 text-2xl font-black">Đơn hàng sẽ hiển thị tại đây</h3>
        <p className="mx-auto mt-2 max-w-md text-base font-semibold leading-relaxed text-[#7b6254]">
          Khi nhân viên thêm bánh vào POS, bạn sẽ thấy từng món, số lượng,
          voucher và tổng tiền được cập nhật tức thì.
        </p>
      </div>
    </div>
  );
}

function BottomMessage({ snapshot }: { snapshot: PosDisplaySnapshot }) {
  if (snapshot.status === "paid" || snapshot.status === "thank_you") {
    return (
      <div className="mt-5 rounded-3xl bg-[#eff8ea] px-5 py-4 text-center text-[#34802f] ring-1 ring-[#cfe8c7]">
        <p className="text-lg font-black">Cảm ơn quý khách!</p>
        <p className="mt-1 text-sm font-bold">
          {snapshot.loyaltyPointsEarned
            ? `Bạn vừa nhận ${snapshot.loyaltyPointsEarned} điểm thưởng.`
            : "Chúc bạn có một ngày thật ngọt ngào."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-3xl bg-white/70 px-5 py-4 text-center text-[#7b6254] ring-1 ring-[#f0e1d2]">
      <p className="text-sm font-black">
        Vui lòng kiểm tra lại món, số lượng và tổng tiền trước khi thanh toán.
      </p>
    </div>
  );
}

function TrustBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white/12 px-4 py-3 text-sm font-black text-white backdrop-blur">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/14 text-[#ffd4a8]">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
