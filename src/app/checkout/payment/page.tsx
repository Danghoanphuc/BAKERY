"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Clock3,
  ExternalLink,
  QrCode,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { resolvePaymentQrImageSrc } from "@/lib/payment-qr";
import { formatPrice } from "@/lib/utils";

type PaymentStatusPayload = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentStatus: "unpaid" | "pending" | "paid" | "refunded";
  paymentMethod?: string;
  payosOrderCode?: number;
  payosCheckoutUrl?: string;
  payosQrCode?: string;
  loyaltyPointsEarned?: number;
  expiresAt?: string;
  secondsRemaining?: number | null;
  cancelReason?: string;
};

export default function CheckoutPaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 text-[#3d2417]">
          <p className="text-sm font-black">Đang tải thông tin thanh toán...</p>
        </main>
      }
    >
      <CheckoutPaymentContent />
    </Suspense>
  );
}

function CheckoutPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const fallbackOrderNumber = searchParams.get("orderNumber");
  const paymentResult = searchParams.get("payment");
  const [payment, setPayment] = useState<PaymentStatusPayload | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSavingQr, setIsSavingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  const qrImageSrc = useMemo(
    () =>
      resolvePaymentQrImageSrc({
        qrCode: payment?.payosQrCode,
        checkoutUrl: payment?.payosCheckoutUrl,
      }),
    [payment?.payosCheckoutUrl, payment?.payosQrCode],
  );
  const isPaid = payment?.paymentStatus === "paid";
  const isCancelled = payment?.status === "cancelled" && !isPaid;
  const orderNumber = payment?.orderNumber ?? fallbackOrderNumber;
  const secondsRemaining = useMemo(() => {
    if (!payment?.expiresAt || isPaid || isCancelled) return null;

    const remaining = Math.ceil(
      (new Date(payment.expiresAt).getTime() - Date.now()) / 1000,
    );
    return Math.max(0, remaining);
  }, [clockTick, isCancelled, isPaid, payment?.expiresAt]);

  const saveQrImage = useCallback(async () => {
    if (!qrImageSrc) return;

    try {
      setIsSavingQr(true);
      const imageResponse = await fetch(qrImageSrc);
      if (!imageResponse.ok) {
        throw new Error("Không thể tải ảnh QR.");
      }

      const blob = await imageResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `bakery-qr-${orderNumber ?? "payment"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (saveError) {
      console.error("Failed to save payment QR:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu ảnh QR. Vui lòng mở trang chuyển khoản để thanh toán.",
      );
    } finally {
      setIsSavingQr(false);
    }
  }, [orderNumber, qrImageSrc]);

  const checkPayment = useCallback(async () => {
    if (!orderId) {
      setError("Thiếu mã đơn hàng. Vui lòng quay lại giỏ hàng và thử lại.");
      return;
    }

    try {
      setIsChecking(true);
      const response = await fetch(`/api/orders/${orderId}/payment-status`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | PaymentStatusPayload
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error
            : "Không thể kiểm tra trạng thái thanh toán.",
        );
      }

      setPayment(data as PaymentStatusPayload);
      setError(null);
    } catch (statusError) {
      console.error("Online payment polling failed:", statusError);
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Không thể kiểm tra trạng thái thanh toán.",
      );
    } finally {
      setIsChecking(false);
    }
  }, [orderId]);

  useEffect(() => {
    checkPayment();
  }, [checkPayment]);

  useEffect(() => {
    if (!orderId || isPaid || isCancelled) return;

    const timer = window.setInterval(checkPayment, 2500);
    return () => window.clearInterval(timer);
  }, [checkPayment, isCancelled, isPaid, orderId]);

  useEffect(() => {
    if (!payment?.expiresAt || isPaid || isCancelled) return;

    const timer = window.setInterval(
      () => setClockTick((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [isCancelled, isPaid, payment?.expiresAt]);

  useEffect(() => {
    if (!isPaid || hasRedirected) return;

    setHasRedirected(true);
    const timer = window.setTimeout(() => {
      router.replace(
        `/order-success?orderNumber=${encodeURIComponent(
          orderNumber ?? "",
        )}&payment=paid`,
      );
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [hasRedirected, isPaid, orderNumber, router]);

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-3 text-[#3d2417]">
      <div className="mx-auto w-full max-w-[440px]">
        <header className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#3d2417] shadow-sm"
            aria-label="Quay lại giỏ hàng"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center leading-tight">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#b84a39]">
              Thanh toán chuyển khoản
            </p>
            <h1 className="text-lg font-black text-[#3d2417]">
              {isPaid
                ? "Đã thanh toán"
                : isCancelled
                  ? "Đã hết hạn"
                  : "Chờ thanh toán"}
            </h1>
          </div>
          <div className="h-10 w-10" />
        </header>

        {error && (
          <div className="mb-2 rounded-[14px] border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-red-700">
            {error}
          </div>
        )}
        {paymentResult === "cancelled" && !isPaid && (
          <div className="mb-2 rounded-[14px] border border-amber-200 bg-amber-50 p-2.5 text-xs font-bold text-amber-900">
            Đơn vẫn đang chờ thanh toán. Bạn có thể quét lại mã QR bên dưới.
          </div>
        )}

        <section className="overflow-hidden rounded-[24px] border border-[#f0dfcc] bg-white shadow-[0_18px_44px_rgba(83,38,12,0.08)]">
          <div
            className={
              isPaid
                ? "flex items-center gap-3 bg-[#eff9ea] px-4 py-4"
                : isCancelled
                  ? "flex items-center gap-3 bg-[#f4ebe1] px-4 py-4"
                  : "flex items-center gap-3 bg-[#fff1f0] px-4 py-4"
            }
          >
            <div
              className={
                isPaid
                  ? "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2f8a45] text-white shadow-[0_14px_30px_rgba(47,138,69,0.24)]"
                  : isCancelled
                    ? "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[#8a6f5b] shadow-sm"
                    : "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[#b84a39] shadow-sm"
              }
            >
              {isPaid ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <QrCode className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black leading-tight text-[#3d2417]">
                {isPaid
                  ? "Thanh toán thành công!"
                  : isCancelled
                    ? "Đơn đã hết hạn"
                    : "Quét mã để thanh toán"}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#7b6254]">
                {isPaid
                  ? "Tiệm đã nhận thanh toán và đang xử lý đơn bánh của bạn."
                  : isCancelled
                    ? "Bạn có thể đặt lại đơn mới khi cần."
                    : "Quét QR, lưu ảnh QR hoặc mở trang chuyển khoản."}
              </p>
            </div>
          </div>

          <div className="p-4">
            {!isPaid && !isCancelled && qrImageSrc && (
              <div className="rounded-[20px] border border-[#f0dfcc] bg-[#fffaf6] p-3 text-center">
                <img
                  src={qrImageSrc}
                  alt="Mã QR thanh toán chuyển khoản"
                  className="mx-auto aspect-square w-full max-w-[220px] rounded-[16px] bg-white object-contain p-2 ring-1 ring-[#f0dfcc]"
                />
                <p className="mt-2 text-[11px] font-bold text-[#9b8171]">
                  QR thanh toán chuyển khoản
                </p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <PaymentInfoRow
                label="Mã đơn"
                value={orderNumber ?? "Đang tải..."}
              />
              <PaymentInfoRow
                label={isPaid ? "Đã thanh toán" : "Cần thanh toán"}
                value={
                  payment ? formatPrice(payment.totalAmount) : "Đang tải..."
                }
                highlight
              />
              <PaymentInfoRow
                label="Trạng thái"
                value={
                  isPaid
                    ? "Đã xác nhận"
                    : isCancelled
                      ? "Đã hủy do quá hạn"
                      : "Đang chờ chuyển khoản"
                }
                wide
              />
            </div>

            {!isPaid && !isCancelled && (
              <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-[#fff8ef] px-3 py-2.5 text-[#7a4b12] ring-1 ring-[#f5ddb0]">
                <Clock3 className="h-4 w-4 shrink-0" />
                <p className="text-xs font-bold leading-5">
                  {secondsRemaining === null
                    ? "Thanh toán xong hệ thống sẽ tự xác nhận trong vài giây."
                    : `Còn ${formatCountdown(secondsRemaining)} để hoàn tất thanh toán.`}
                </p>
              </div>
            )}

            {isPaid && (
              <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-[#eff9ea] px-3 py-2.5 text-[#2f6f3d] ring-1 ring-[#d5ebcf]">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <p className="text-xs font-bold leading-5">
                  Đang chuyển sang trang hoàn tất đơn.
                </p>
              </div>
            )}

            <div className="mt-3 grid gap-2">
              {!isPaid && !isCancelled && (
                <div className="grid grid-cols-2 gap-2">
                  {qrImageSrc && (
                    <button
                      type="button"
                      onClick={saveQrImage}
                      disabled={isSavingQr}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] bg-[#3d2417] text-xs font-black text-white shadow-[0_8px_18px_rgba(61,36,23,0.18)] disabled:cursor-not-allowed disabled:bg-[#d8c8bd]"
                    >
                      <Download className="h-4 w-4" />
                      {isSavingQr ? "Đang lưu..." : "Lưu QR"}
                    </button>
                  )}

                  {payment?.payosCheckoutUrl && (
                    <a
                      href={payment.payosCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] border border-[#eadbcc] bg-white text-xs font-black text-[#3d2417]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Mở chuyển khoản
                    </a>
                  )}
                </div>
              )}

              {isCancelled ? (
                <button
                  type="button"
                  onClick={() => router.push("/cart")}
                  className="flex h-11 items-center justify-center rounded-[14px] bg-[#3d2417] text-sm font-black text-white shadow-[0_8px_18px_rgba(61,36,23,0.18)]"
                >
                  Đặt lại đơn mới
                </button>
              ) : (
                <button
                  type="button"
                  onClick={checkPayment}
                  disabled={isChecking || isPaid}
                  className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#b84a39] text-sm font-black text-white shadow-[0_8px_18px_rgba(184,74,57,0.24)] disabled:cursor-not-allowed disabled:bg-[#d8c8bd]"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
                  />
                  {isChecking ? "Đang kiểm tra..." : "Tôi đã thanh toán"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PaymentInfoRow({
  label,
  value,
  highlight = false,
  wide = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-[14px] bg-[#fffaf6] px-3 py-2.5 ${
        wide ? "col-span-2 flex items-center justify-between gap-3" : ""
      }`}
    >
      <span className="block text-[11px] font-bold uppercase tracking-[0.05em] text-[#9b8171]">
        {label}
      </span>
      <span
        className={
          highlight
            ? "mt-1 block truncate text-lg font-black text-[#b84a39]"
            : "mt-1 block truncate text-sm font-black text-[#3d2417]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
