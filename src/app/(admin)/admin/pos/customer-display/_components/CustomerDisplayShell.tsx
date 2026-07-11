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
    title: "Quét mã QR để thanh toán",
    description: "Mở app ngân hàng và quét mã bên cạnh để hoàn tất thanh toán.",
  },
  paid: {
    label: "Đã thanh toán",
    title: "Thanh toán thành công",
    description: "Cảm ơn bạn, đơn hàng đang được hoàn tất.",
  },
  thank_you: {
    label: "Cảm ơn quý khách",
    title: "Thanh toán thành công",
    description: "Chúc bạn có một ngày thật ngọt ngào. Hẹn gặp lại bạn trong lần mua bánh tiếp theo.",
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
  const heroTitle =
    snapshot.status === "awaiting_payment" ||
    snapshot.status === "paid" ||
    snapshot.status === "thank_you" ||
    !featuredItem
      ? copy.title
      : featuredItem.productName;

  return (
    <main className="fixed inset-0 z-[9999] overflow-hidden bg-[#3d2417] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <HeroPanel
          snapshot={snapshot}
          featuredItem={featuredItem}
          title={heroTitle}
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
  const isPaymentSuccess =
    snapshot.status === "paid" || snapshot.status === "thank_you";

  return (
    <section
      className={clsx(
        "relative flex min-h-[46vh] flex-col justify-between overflow-hidden p-8 lg:min-h-screen lg:p-12",
        isPaymentSuccess ? "bg-[#f7fff4] text-[#18351f]" : "bg-[#4a2b1c]",
      )}
    >
      <div
        className={clsx(
          "absolute inset-0",
          isPaymentSuccess
            ? "bg-[linear-gradient(140deg,#f7fff4_0%,#eff9e9_44%,#fff4df_100%)]"
            : "bg-[radial-gradient(circle_at_20%_10%,rgba(255,241,240,0.18),transparent_34%),linear-gradient(145deg,rgba(184,74,57,0.32),transparent_46%)]",
        )}
      />
      {isPaymentSuccess && <SuccessConfetti />}
      {!isPaymentSuccess && featuredItem?.imageUrl ? (
        <div className="absolute inset-0 opacity-38">
          <ProductImage
            src={featuredItem.imageUrl}
            alt={featuredItem.productName}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#3d2417]/70 via-[#3d2417]/48 to-[#3d2417]/76" />
        </div>
      ) : !isPaymentSuccess ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#4a2b1c_0%,#7a3f32_46%,#b84a39_100%)] opacity-80" />
      ) : null}

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "grid h-14 w-14 place-items-center rounded-3xl bg-white text-xl font-black shadow-2xl",
              isPaymentSuccess ? "text-[#2f8a45]" : "text-[#b84a39]",
            )}
          >
            B
          </span>
          <div>
            <p
              className={clsx(
                "text-sm font-black uppercase tracking-[0.18em]",
                isPaymentSuccess ? "text-[#5b7d62]" : "text-white/70",
              )}
            >
              Bakery POS
            </p>
            <p className="text-lg font-black">Tiệm bánh của bạn</p>
          </div>
        </div>
        <div
          className={clsx(
            "hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-black backdrop-blur md:flex",
            isPaymentSuccess
              ? "bg-white/70 text-[#2f6f3d] ring-1 ring-[#d9ebd5]"
              : "bg-white/12 text-white",
          )}
        >
          <Sparkles
            className={clsx(
              "h-4 w-4",
              isPaymentSuccess ? "text-[#2f8a45]" : "text-[#ffd4a8]",
            )}
          />
          {isPaymentSuccess ? "Thanh toán đã xác nhận" : "Bánh tươi mỗi ngày"}
        </div>
      </div>

      <div className="relative z-10 max-w-2xl py-10">
        <div
          className={clsx(
            "mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black backdrop-blur",
            isPaymentSuccess
              ? "bg-white/75 text-[#2f6f3d] ring-1 ring-[#d9ebd5]"
              : "bg-white/14 text-white",
          )}
        >
          {snapshot.status === "awaiting_payment" ? (
            <CreditCard className="h-4 w-4 text-[#ffd4a8]" />
          ) : snapshot.status === "paid" || snapshot.status === "thank_you" ? (
            <CheckCircle2 className="h-4 w-4 text-[#2f8a45]" />
          ) : (
            <Heart className="h-4 w-4 text-[#ffd4a8]" />
          )}
          {hasItems ? `${snapshot.items.length} món trong đơn` : "Rất vui được phục vụ bạn"}
        </div>
        {snapshot.status === "awaiting_payment" && snapshot.paymentQrCode ? (
          <HeroPaymentQr snapshot={snapshot} description={description} />
        ) : isPaymentSuccess ? (
          <HeroPaymentSuccess
            snapshot={snapshot}
            title={title}
            description={description}
          />
        ) : (
          <>
            <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-normal text-white md:text-7xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-relaxed text-white/78 md:text-xl">
              {description}
            </p>
          </>
        )}
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-3">
        <TrustBadge
          icon={<ReceiptText className="h-5 w-5" />}
          label="Kiểm đơn rõ ràng"
          success={isPaymentSuccess}
        />
        <TrustBadge
          icon={<Gift className="h-5 w-5" />}
          label="Tích điểm & voucher"
          success={isPaymentSuccess}
        />
        <TrustBadge
          icon={<Clock3 className="h-5 w-5" />}
          label="Thanh toán nhanh"
          success={isPaymentSuccess}
        />
      </div>
    </section>
  );
}

function HeroPaymentSuccess({
  snapshot,
  title,
  description,
}: {
  snapshot: PosDisplaySnapshot;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl rounded-[2rem] bg-white/82 p-6 text-[#18351f] shadow-[0_26px_80px_rgba(47,111,61,0.18)] ring-1 ring-[#d9ebd5] backdrop-blur md:p-8">
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#9de1aa]/45" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#2f8a45] text-white shadow-[0_16px_34px_rgba(47,138,69,0.30)] md:h-24 md:w-24">
            <CheckCircle2 className="h-12 w-12 md:h-14 md:w-14" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2f8a45]">
            Đã nhận thanh toán
          </p>
          <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-normal text-[#18351f] md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-relaxed text-[#55705b] md:text-xl">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-[#18351f] px-5 py-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/58">
            Tổng tiền đã thanh toán
          </p>
          <p className="mt-1 text-4xl font-black text-[#f8d78d] md:text-5xl">
            {formatCurrency(snapshot.totalAmount)}
          </p>
        </div>
        <div className="rounded-3xl bg-[#fff7e8] px-5 py-4 text-[#6f4b14] ring-1 ring-[#f1deb6]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a97825]">
            Mã đơn
          </p>
          <p className="mt-2 break-words text-2xl font-black text-[#4d3310]">
            {snapshot.orderNumber ?? "Đã xác nhận"}
          </p>
          <p className="mt-2 text-sm font-bold text-[#8c6830]">
            Nhân viên sẽ hoàn tất đơn cho bạn ngay.
          </p>
        </div>
      </div>

      {snapshot.loyaltyPointsEarned ? (
        <div className="mt-4 rounded-3xl bg-[#eef9ea] px-5 py-4 text-[#2f6f3d] ring-1 ring-[#d5ebcf]">
          <p className="text-sm font-black">
            Bạn vừa nhận {snapshot.loyaltyPointsEarned} điểm thưởng cho lần ghé tiếp theo.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SuccessConfetti() {
  const pieces = [
    "left-[8%] top-[18%] h-3 w-8 rotate-12 bg-[#f8d78d]",
    "left-[18%] top-[34%] h-2 w-6 -rotate-12 bg-[#82cf91]",
    "left-[35%] top-[14%] h-2 w-7 rotate-45 bg-[#b84a39]",
    "left-[54%] top-[25%] h-3 w-3 rotate-12 rounded-full bg-[#2f8a45]",
    "left-[72%] top-[16%] h-2 w-8 -rotate-45 bg-[#f8d78d]",
    "left-[86%] top-[38%] h-3 w-6 rotate-12 bg-[#82cf91]",
    "left-[62%] top-[76%] h-2 w-7 rotate-45 bg-[#b84a39]",
    "left-[24%] top-[78%] h-3 w-3 rounded-full bg-[#2f8a45]",
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {pieces.map((className) => (
        <span
          key={className}
          className={clsx(
            "absolute animate-bounce rounded-full opacity-70 shadow-sm",
            className,
          )}
        />
      ))}
    </div>
  );
}

function HeroPaymentQr({
  snapshot,
  description,
}: {
  snapshot: PosDisplaySnapshot;
  description: string;
}) {
  return (
    <div className="grid max-w-2xl items-center gap-6 rounded-[2rem] bg-white/94 p-5 text-[#3d2417] shadow-[0_24px_70px_rgba(0,0,0,0.24)] ring-1 ring-white/60 backdrop-blur sm:grid-cols-[minmax(0,1fr)_240px] md:p-6">
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b84a39]">
          Thanh toán QR / CK
        </p>
        <h1 className="mt-3 text-4xl font-black leading-none tracking-normal text-[#3d2417] md:text-5xl">
          Quét mã QR để thanh toán
        </h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[#7b6254] md:text-lg">
          {description}
        </p>
        <div className="mt-5 rounded-3xl bg-[#9f3f32] px-5 py-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/64">
            Số tiền cần thanh toán
          </p>
          <p className="mt-1 text-3xl font-black text-[#ffd4a8] md:text-4xl">
            {formatCurrency(snapshot.totalAmount)}
          </p>
          {snapshot.orderNumber && (
            <p className="mt-2 text-sm font-bold text-white/76">
              Mã đơn {snapshot.orderNumber}
            </p>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[240px] rounded-[1.75rem] bg-white p-3 shadow-inner ring-1 ring-[#f0e1d2]">
        <img
          src={snapshot.paymentQrCode}
          alt="Mã QR thanh toán"
          className="aspect-square w-full rounded-2xl object-contain"
        />
      </div>
    </div>
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
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b84a39]">
            {statusLabel}
          </p>
          {snapshot.customerName ? (
            <h2 className="mt-1 text-3xl font-black leading-tight">
              Xin chào{" "}
              <span className="font-dancing-script text-5xl uppercase leading-none text-[#b84a39]">
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
                  <DisplayLineItem
                    key={item.cartItemId}
                    item={item}
                    paid={snapshot.status === "paid" || snapshot.status === "thank_you"}
                  />
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
  paid = false,
}: {
  item: PosDisplaySnapshot["items"][number];
  paid?: boolean;
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
        <h3
          className={clsx(
            "truncate font-black",
            paid ? "text-2xl text-[#2f8a45]" : "text-lg text-[#3d2417]",
          )}
        >
          {paid ? "Thanh toán thành công" : item.productName}
        </h3>
        {paid && (
          <p className="mt-1 truncate text-sm font-bold text-[#6f8068]">
            {item.productName}
          </p>
        )}
        {details.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#7b6254]">
            {details.join(" / ")}
          </p>
        )}
        <p className="mt-2 text-sm font-black text-[#b84a39]">
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
  const isAwaitingQrPayment =
    snapshot.status === "awaiting_payment" && Boolean(snapshot.paymentQrCode);
  const isPaymentSuccess =
    snapshot.status === "paid" || snapshot.status === "thank_you";

  return (
    <div className="border-t border-[#f0e1d2] bg-white p-5">
      <div className="space-y-2 text-base font-bold text-[#7b6254]">
        <TotalRow label="Tạm tính" value={snapshot.subtotal} />
        {snapshot.discountAmount > 0 && (
          <>
            <TotalRow label="Voucher" value={-snapshot.discountAmount} accent />
            {snapshot.voucher && (
              <div className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-black text-[#b84a39]">
                Đã áp dụng {snapshot.voucher.code} - {snapshot.voucher.title}
              </div>
            )}
          </>
        )}
      </div>
      {isAwaitingQrPayment ? (
        <div className="mt-4 rounded-3xl bg-[#fff8ef] px-5 py-4 text-center text-[#7a4b12] ring-1 ring-[#f5ddb0]">
          <p className="text-sm font-black uppercase tracking-[0.14em]">
            Đang chờ xác nhận chuyển khoản
          </p>
          {snapshot.orderNumber && (
            <p className="mt-1 text-sm font-bold text-[#9b6a2f]">
              Mã đơn {snapshot.orderNumber}
            </p>
          )}
        </div>
      ) : isPaymentSuccess ? null : (
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
      )}
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
        accent && "text-[#b84a39]",
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
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#fff1f0] text-[#b84a39]">
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
  if (snapshot.status === "awaiting_payment" && snapshot.paymentQrCode) {
    return (
      <div className="mt-5 rounded-3xl bg-[#fff8ef] px-5 py-4 text-center text-[#7a4b12] ring-1 ring-[#f5ddb0]">
        <p className="text-sm font-black">
          Vui lòng quét mã QR và chờ xác nhận thanh toán.
        </p>
      </div>
    );
  }

  if (snapshot.status === "paid" || snapshot.status === "thank_you") {
    return null;
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
  success = false,
}: {
  icon: React.ReactNode;
  label: string;
  success?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-black backdrop-blur",
        success
          ? "bg-white/72 text-[#2f6f3d] ring-1 ring-[#d9ebd5]"
          : "bg-white/12 text-white",
      )}
    >
      <span
        className={clsx(
          "grid h-10 w-10 place-items-center rounded-2xl",
          success
            ? "bg-[#eef9ea] text-[#2f8a45]"
            : "bg-white/14 text-[#ffd4a8]",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
