"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  CheckCircle2,
  CreditCard,
  Heart,
  MonitorUp,
  ReceiptText,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { clsx } from "clsx";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { getCartItemVariantDetails } from "@/types";
import {
  emptyPosDisplaySnapshot,
  PosDisplayConnectionState,
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

const SUCCESS_DISPLAY_MS = 9_000;
const CONFETTI_PIECES = [
  { x: -90, y: -190, r: -220, color: "#b84a39", delay: 0 },
  { x: -60, y: -270, r: 180, color: "#f1c86b", delay: 50 },
  { x: -30, y: -150, r: -140, color: "#4f9554", delay: 110 },
  { x: -80, y: -300, r: 260, color: "#d98c72", delay: 20 },
  { x: -45, y: -210, r: -200, color: "#f8d78d", delay: 140 },
  { x: -15, y: -330, r: 180, color: "#b84a39", delay: 80 },
  { x: 20, y: -190, r: -260, color: "#6baa72", delay: 170 },
  { x: 70, y: -340, r: 240, color: "#f1c86b", delay: 30 },
  { x: 120, y: -210, r: -180, color: "#d98c72", delay: 120 },
  { x: 170, y: -310, r: 280, color: "#4f9554", delay: 60 },
  { x: 220, y: -170, r: -210, color: "#f8d78d", delay: 150 },
  { x: 270, y: -280, r: 200, color: "#b84a39", delay: 10 },
  { x: 320, y: -160, r: -260, color: "#6baa72", delay: 100 },
  { x: 370, y: -230, r: 240, color: "#f1c86b", delay: 40 },
  { x: -70, y: 90, r: 180, color: "#d98c72", delay: 75 },
  { x: 0, y: 130, r: -240, color: "#4f9554", delay: 130 },
  { x: 240, y: 120, r: 220, color: "#b84a39", delay: 90 },
  { x: 340, y: 80, r: -180, color: "#f8d78d", delay: 160 },
];

export function CustomerDisplayShell({
  sessionId,
  displayToken,
}: {
  sessionId: string;
  displayToken: string;
}) {
  const [snapshot, setSnapshot] = useState<PosDisplaySnapshot>(
    emptyPosDisplaySnapshot,
  );
  const [connection, setConnection] =
    useState<PosDisplayConnectionState>("connecting");

  useEffect(
    () =>
      subscribePosDisplaySnapshot(
        sessionId,
        displayToken,
        setSnapshot,
        setConnection,
      ),
    [displayToken, sessionId],
  );

  const featuredItem = useMemo(
    () => snapshot.items[snapshot.items.length - 1] ?? snapshot.items[0],
    [snapshot.items],
  );

  if (!sessionId || !displayToken || connection === "invalid") {
    return <InvalidDisplaySession />;
  }
  const copy = statusCopy[snapshot.status];
  const hasItems = snapshot.items.length > 0;
  const isPaymentSuccess =
    snapshot.status === "paid" || snapshot.status === "thank_you";
  const orderFirstOnTablet =
    snapshot.status === "editing" || snapshot.status === "awaiting_payment";
  const heroTitle =
    snapshot.status === "awaiting_payment" ||
    snapshot.status === "paid" ||
    snapshot.status === "thank_you" ||
    !featuredItem
      ? copy.title
      : featuredItem.productName;

  if (isPaymentSuccess) {
    return (
      <PaymentSuccessTakeover snapshot={snapshot} connection={connection} />
    );
  }

  return (
    <main className="fixed inset-0 z-[9999] overflow-y-auto bg-[#3d2417] text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-hidden">
      <div
        className={clsx(
          "grid min-h-full lg:h-full",
          snapshot.status === "awaiting_payment"
            ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"
            : isPaymentSuccess
              ? "lg:grid-cols-[minmax(420px,1fr)_minmax(0,1fr)]"
              : "lg:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]",
        )}
      >
        <HeroPanel
          snapshot={snapshot}
          featuredItem={featuredItem}
          title={heroTitle}
          description={copy.description}
          hasItems={hasItems}
          className={orderFirstOnTablet ? "order-2" : "order-1"}
        />
        <OrderPanel
          snapshot={snapshot}
          statusLabel={copy.label}
          connection={connection}
          className={orderFirstOnTablet ? "order-1" : "order-2"}
          fillViewport={orderFirstOnTablet}
        />
      </div>
    </main>
  );
}

function InvalidDisplaySession() {
  return (
    <main className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-[#3d2417] p-6 text-white">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center text-[#3d2417] shadow-2xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#fff1f0] text-[#b84a39]">
          <MonitorUp className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-3xl font-black">Chưa ghép với quầy POS</h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-[#7b6254]">
          Hãy mở màn hình khách từ nút màn hình trên POS. Liên kết của mỗi quầy là
          riêng biệt và tự hết hạn để bảo vệ dữ liệu đơn hàng.
        </p>
      </div>
    </main>
  );
}

function ConnectionBadge({ state }: { state: PosDisplayConnectionState }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (state !== "connected") return;
    const timer = window.setTimeout(() => setVisible(false), 2_500);
    return () => window.clearTimeout(timer);
  }, [state]);

  if (!visible) return null;

  const config = {
    connecting: {
      label: "Đang kết nối quầy",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
      icon: <Wifi className="h-4 w-4 animate-pulse" />,
    },
    connected: {
      label: "Đã kết nối quầy",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: <Wifi className="h-4 w-4" />,
    },
    stale: {
      label: "Dữ liệu đang chậm cập nhật",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
      icon: <WifiOff className="h-4 w-4" />,
    },
    disconnected: {
      label: "Mất kết nối với quầy · vui lòng báo nhân viên",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: <WifiOff className="h-4 w-4" />,
    },
    invalid: {
      label: "Phiên không hợp lệ",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: <WifiOff className="h-4 w-4" />,
    },
  }[state];

  return (
    <div
      className={clsx(
        "flex max-w-full items-center gap-2 rounded-full px-3 py-2 text-xs font-black shadow-sm ring-1",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </div>
  );
}

function PaymentSuccessTakeover({
  snapshot,
  connection,
}: {
  snapshot: PosDisplaySnapshot;
  connection: PosDisplayConnectionState;
}) {
  const [now, setNow] = useState(Date.now());
  const completedAt = useMemo(() => {
    const parsed = new Date(snapshot.updatedAt).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [snapshot.updatedAt]);
  const remainingMs = Math.max(0, completedAt + SUCCESS_DISPLAY_MS - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = Math.min(100, (remainingMs / SUCCESS_DISPLAY_MS) * 100);
  const firstItem = snapshot.items[0];
  const otherItemCount = Math.max(0, snapshot.items.length - 1);
  const totalQuantity = snapshot.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const paymentLabel = snapshot.paymentMethod
    ? paymentLabels[snapshot.paymentMethod] ?? "Thanh toán"
    : "Thanh toán";
  const itemDetails = firstItem
    ? [
        ...getCartItemVariantDetails(firstItem),
        firstItem.customMessage ? `Chữ "${firstItem.customMessage}"` : null,
        firstItem.candles ? `${firstItem.candles} nến` : null,
      ].filter(Boolean)
    : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="fixed inset-0 z-[9999] overflow-y-auto bg-[#fffaf2] text-[#203824] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(151,210,146,0.22),transparent_34%),linear-gradient(145deg,#fbfff5_0%,#fffaf1_54%,#fff4e8_100%)]" />
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-black text-[#4f9554] shadow-sm ring-1 ring-[#dcebd8]">
              B
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6a8a6d]">
                Bakery POS
              </p>
              <p className="text-base font-black text-[#203824] sm:text-lg">
                Tiệm bánh của bạn
              </p>
            </div>
          </div>
          <ConnectionBadge state={connection} />
        </header>

        <section className="flex flex-1 items-center justify-center py-4 sm:py-6">
          <div className="w-full max-w-5xl rounded-[2rem] bg-white/88 p-5 shadow-[0_28px_90px_rgba(50,91,55,0.14)] ring-1 ring-[#dcebd8] backdrop-blur sm:p-7 lg:p-8 [@media(max-height:700px)]:p-5">
            <div className="grid items-center gap-5 sm:grid-cols-[96px_minmax(0,1fr)] lg:gap-7">
              <div className="success-check-ring relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#4f9554] text-white shadow-[0_18px_42px_rgba(79,149,84,0.28)]">
                <CelebrationBurst />
                <span className="absolute inset-[-12px] rounded-full border border-[#87bf8a]/35" />
                <CheckCircle2 className="success-check-icon h-14 w-14" />
              </div>

              <div className="min-w-0 text-center sm:text-left">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#4f9554]">
                  Đã nhận thanh toán
                </p>
                <h1 className="mt-1 text-3xl font-black leading-tight text-[#203824] sm:text-4xl">
                  Thanh toán thành công
                </h1>
                <p className="mt-2 text-5xl font-black leading-none tracking-tight text-[#9a6b18] sm:text-6xl lg:text-7xl [@media(max-height:700px)]:text-5xl">
                  {formatCurrency(snapshot.totalAmount)}
                </p>
                <p className="mt-3 text-sm font-bold text-[#607463] sm:text-base">
                  Cảm ơn bạn. Đơn hàng đang được nhân viên hoàn tất.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-black sm:justify-start">
                  {snapshot.orderNumber && (
                    <span className="rounded-full bg-[#fff6df] px-3 py-2 text-[#81591a] ring-1 ring-[#efd9a5]">
                      Mã đơn {snapshot.orderNumber}
                    </span>
                  )}
                  <span className="rounded-full bg-[#eef8ec] px-3 py-2 text-[#3f7944] ring-1 ring-[#d4e8d1]">
                    {paymentLabel}
                  </span>
                </div>
              </div>
            </div>

            {firstItem && (
              <article className="mt-5 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-[#fffaf5] p-3 text-[#3d2417] ring-1 ring-[#f0e1d2] sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#f7eee7] sm:h-[72px] sm:w-[72px]">
                  <ProductImage
                    src={firstItem.imageUrl}
                    alt={firstItem.productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="break-words text-base font-black leading-snug sm:text-lg">
                    {firstItem.productName}
                  </h2>
                  {itemDetails.length > 0 && (
                    <p className="mt-0.5 break-words text-xs font-semibold text-[#7b6254] sm:text-sm">
                      {itemDetails.join(" / ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-black text-[#b84a39] sm:text-sm">
                    {firstItem.quantity} × {formatCurrency(firstItem.price)}
                    {otherItemCount > 0 ? ` · +${otherItemCount} món khác` : ""}
                  </p>
                </div>
              </article>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-black">
              <span className="rounded-full bg-white px-3 py-2 text-[#607463] ring-1 ring-[#dcebd8]">
                {totalQuantity} món trong đơn
              </span>
              {snapshot.paymentMethod === "cash" &&
                typeof snapshot.changeAmount === "number" &&
                snapshot.changeAmount > 0 && (
                  <span className="rounded-full bg-[#fff6df] px-3 py-2 text-[#81591a] ring-1 ring-[#efd9a5]">
                    Tiền thừa {formatCurrency(snapshot.changeAmount)}
                  </span>
                )}
              {Boolean(snapshot.loyaltyPointsEarned) && (
                <span className="rounded-full bg-[#eef8ec] px-3 py-2 text-[#3f7944] ring-1 ring-[#d4e8d1]">
                  +{snapshot.loyaltyPointsEarned} điểm thưởng
                </span>
              )}
            </div>
          </div>
        </section>

        <footer className="mx-auto w-full max-w-3xl text-center">
          <p className="text-sm font-bold text-[#607463]">
            Sẵn sàng cho đơn tiếp theo sau {remainingSeconds} giây
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dfe9dc]">
            <div
              className="h-full rounded-full bg-[#4f9554] transition-[width] duration-300 ease-linear motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </footer>
      </div>
    </main>
  );
}

function CelebrationBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden="true">
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={`${piece.x}-${piece.y}-${index}`}
          className="success-confetti absolute left-1/2 top-1/2 h-2 w-4 rounded-sm"
          style={
            {
              "--confetti-x": `${piece.x}px`,
              "--confetti-y": `${piece.y}px`,
              "--confetti-r": `${piece.r}deg`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
      <style>{`
        .success-confetti {
          opacity: 0;
          animation: success-confetti-burst 1050ms cubic-bezier(0.16, 0.82, 0.3, 1)
            forwards;
        }
        .success-check-ring {
          animation: success-ring-in 720ms cubic-bezier(0.2, 1.35, 0.35, 1) both;
        }
        .success-check-icon {
          animation: success-check-in 520ms 180ms cubic-bezier(0.2, 1.4, 0.35, 1)
            both;
        }
        @keyframes success-confetti-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.4) rotate(0deg);
          }
          12% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--confetti-x)),
                calc(-50% + var(--confetti-y))
              )
              scale(1) rotate(var(--confetti-r));
          }
        }
        @keyframes success-ring-in {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes success-check-in {
          0% {
            opacity: 0;
            transform: scale(0.45) rotate(-10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .success-confetti {
            display: none;
          }
          .success-check-ring,
          .success-check-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function HeroPanel({
  snapshot,
  featuredItem,
  title,
  description,
  hasItems,
  className,
}: {
  snapshot: PosDisplaySnapshot;
  featuredItem?: PosDisplaySnapshot["items"][number];
  title: string;
  description: string;
  hasItems: boolean;
  className?: string;
}) {
  const isPaymentSuccess =
    snapshot.status === "paid" || snapshot.status === "thank_you";

  return (
    <section
      className={clsx(
        "relative flex min-h-[42vh] flex-col overflow-hidden p-6 lg:order-1 lg:h-full lg:min-h-0 lg:p-8 xl:p-10",
        className,
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

      <div
        className={clsx(
          "relative z-10 flex items-center justify-between gap-4",
          (isPaymentSuccess || snapshot.status === "awaiting_payment") &&
            "[@media(max-height:700px)]:hidden",
        )}
      >
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

      <div className="relative z-10 flex max-w-2xl flex-1 flex-col justify-center py-6 lg:py-3">
        <div
          className={clsx(
            "mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black backdrop-blur",
            isPaymentSuccess && "[@media(max-height:700px)]:hidden",
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
          {hasItems
            ? `${snapshot.items.reduce((sum, item) => sum + item.quantity, 0)} món trong đơn`
            : "Rất vui được phục vụ bạn"}
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
            <h1 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-normal text-white sm:text-5xl 2xl:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-relaxed text-white/78 md:text-xl">
              {description}
            </p>
          </>
        )}
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
    <div className="max-w-2xl rounded-[2rem] bg-white/82 p-5 text-[#18351f] shadow-[0_26px_80px_rgba(47,111,61,0.18)] ring-1 ring-[#d9ebd5] backdrop-blur xl:p-7">
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#9de1aa]/45" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full bg-[#2f8a45] text-white shadow-[0_16px_34px_rgba(47,138,69,0.30)] xl:h-20 xl:w-20">
            <CheckCircle2 className="h-10 w-10 xl:h-12 xl:w-12" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2f8a45]">
            Đã nhận thanh toán
          </p>
          <h1 className="mt-2 text-3xl font-black leading-none tracking-normal text-[#18351f] xl:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-[#55705b] xl:text-lg">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 2xl:grid-cols-2">
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
      <p className="mt-4 text-center text-sm font-bold text-[#55705b]">
        Màn hình sẽ tự sẵn sàng cho đơn tiếp theo.
      </p>
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
  const [now, setNow] = useState(Date.now());
  const [qrFailed, setQrFailed] = useState(false);
  const remainingSeconds = snapshot.paymentDeadline
    ? Math.max(0, Math.ceil((snapshot.paymentDeadline - now) / 1000))
    : null;
  const isExpired = remainingSeconds === 0;

  useEffect(() => {
    if (!snapshot.paymentDeadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.paymentDeadline]);

  useEffect(() => {
    setQrFailed(false);
    setNow(Date.now());
  }, [snapshot.paymentQrCode]);

  return (
    <div className="grid max-w-2xl items-center gap-4 rounded-[2rem] bg-white/94 p-5 text-[#3d2417] shadow-[0_24px_70px_rgba(0,0,0,0.24)] ring-1 ring-white/60 backdrop-blur lg:grid-cols-[minmax(0,1fr)_200px] xl:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b84a39]">
          Thanh toán QR / CK
        </p>
        <h1 className="mt-2 text-3xl font-black leading-none tracking-normal text-[#3d2417] xl:text-4xl">
          Quét mã QR để thanh toán
        </h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[#7b6254] md:text-lg">
          {isExpired
            ? "Mã QR đã hết hạn. Vui lòng báo nhân viên để tạo mã mới."
            : description}
        </p>
        {remainingSeconds !== null && !isExpired && (
          <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-200">
            Mã còn hiệu lực {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
          </p>
        )}
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
      <div className="mx-auto grid aspect-square w-full max-w-[220px] place-items-center rounded-[1.75rem] bg-white p-3 shadow-inner ring-1 ring-[#f0e1d2]">
        {isExpired || qrFailed ? (
          <div className="px-4 text-center">
            <WifiOff className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm font-black text-red-700">
              {isExpired ? "QR đã hết hạn" : "Không tải được mã QR"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#7b6254]">
              Vui lòng báo nhân viên tại quầy.
            </p>
          </div>
        ) : (
          <img
            src={snapshot.paymentQrCode}
            alt="Mã QR thanh toán"
            onError={() => setQrFailed(true)}
            className="aspect-square w-full rounded-2xl object-contain"
          />
        )}
      </div>
    </div>
  );
}

function OrderPanel({
  snapshot,
  statusLabel,
  connection,
  className,
  fillViewport,
}: {
  snapshot: PosDisplaySnapshot;
  statusLabel: string;
  connection: PosDisplayConnectionState;
  className?: string;
  fillViewport: boolean;
}) {
  const hasItems = snapshot.items.length > 0;
  const paymentLabel = snapshot.paymentMethod
    ? paymentLabels[snapshot.paymentMethod] ?? "Thanh toán"
    : "Chưa chọn";

  return (
    <section
      className={clsx(
        "flex flex-col bg-[#fffaf6] p-5 text-[#3d2417] sm:p-6 lg:order-2 lg:h-full lg:min-h-0 lg:p-8",
        fillViewport ? "h-screen min-h-0" : "min-h-[58vh]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b84a39]">
            {statusLabel}
          </p>
          {snapshot.customerName ? (
            <h2 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">
              Xin chào <span className="text-[#b84a39]">{snapshot.customerName}</span>
            </h2>
          ) : (
            <h2 className="mt-1 text-3xl font-black">Đơn hàng của bạn</h2>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ConnectionBadge state={connection} />
          {hasItems && (
            <div className="rounded-2xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-[#f0e1d2]">
              <p className="text-[11px] font-black text-[#9b8171]">Thanh toán</p>
              <p className="mt-0.5 text-sm font-black text-[#3d2417]">{paymentLabel}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-[0_18px_46px_rgba(61,36,23,0.10)] ring-1 ring-[#f0e1d2]">
        {hasItems ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 [@media(max-height:700px)]:p-3">
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

      {hasItems && <BottomMessage snapshot={snapshot} />}
    </section>
  );
}

function DisplayLineItem({
  item,
}: {
  item: PosDisplaySnapshot["items"][number];
}) {
  const details = [
    ...getCartItemVariantDetails(item),
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
        <h3 className="break-words text-lg font-black leading-snug text-[#3d2417]">
          {item.productName}
        </h3>
        {details.length > 0 && (
          <p className="mt-1 break-words text-sm font-semibold text-[#7b6254]">
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
    <div className="border-t border-[#f0e1d2] bg-white p-5 [@media(max-height:700px)]:p-3">
      <div className="space-y-2 text-base font-bold text-[#7b6254] [@media(max-height:700px)]:space-y-1 [@media(max-height:700px)]:text-sm">
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
        {snapshot.paymentMethod === "cash" &&
          typeof snapshot.cashReceived === "number" &&
          snapshot.cashReceived > 0 && (
            <>
              <TotalRow label="Khách đã đưa" value={snapshot.cashReceived} />
              <TotalRow
                label="Tiền thừa"
                value={snapshot.changeAmount ?? 0}
                accent
              />
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
      ) : isPaymentSuccess ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl bg-[#18351f] px-5 py-4 text-white shadow-[0_18px_34px_rgba(24,53,31,0.20)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-white/60">
              Đã thanh toán
            </p>
            {snapshot.orderNumber && (
              <p className="mt-1 text-sm font-bold text-white/75">
                Mã đơn {snapshot.orderNumber}
              </p>
            )}
          </div>
          <p className="text-3xl font-black text-[#f8d78d] sm:text-4xl">
            {formatCurrency(snapshot.totalAmount)}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-end justify-between gap-4 rounded-3xl bg-[#9f3f32] px-5 py-5 text-white shadow-[0_18px_34px_rgba(159,63,50,0.24)] [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:px-4 [@media(max-height:700px)]:py-3">
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
          <p className="text-4xl font-black text-[#ffd4a8] md:text-5xl [@media(max-height:700px)]:text-3xl">
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
    return null;
  }

  if (snapshot.status === "paid" || snapshot.status === "thank_you") {
    return null;
  }

  return (
    <div className="mt-5 rounded-3xl bg-white/70 px-5 py-4 text-center text-[#7b6254] ring-1 ring-[#f0e1d2] [@media(max-height:700px)]:hidden">
      <p className="text-sm font-black">
        Vui lòng kiểm tra lại món, số lượng và tổng tiền trước khi thanh toán.
      </p>
    </div>
  );
}
