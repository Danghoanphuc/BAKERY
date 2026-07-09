"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import { formatPrice } from "@/lib/utils";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { getPhoneError, sanitizePhone } from "@/features/auth/pin-ui";
import type { Customer } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { config, setDeliveryAddress } = useOrderConfigStore();
  const { selectedVoucher, clearSelectedVoucher } = useVoucherStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hasLoadedCustomer, setHasLoadedCustomer] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    gender: "",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">(
    "cod",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const isPickup = config.deliveryMode === "pickup";
  const voucherPricing = calculateVoucherPricing(totalPrice, selectedVoucher);
  const deliveryFee = isPickup || totalPrice >= 149000 ? 0 : 20000;
  const finalTotal = voucherPricing.totalAfterDiscount + deliveryFee;
  const isPhoneVerified = Boolean(customer?.phoneVerifiedAt);

  const destinationLabel = useMemo(() => {
    if (isPickup) return "Nhận tại cửa hàng chính";
    if (!config.deliveryAddress) return "Chưa chọn địa chỉ giao hàng";
    return `${config.deliveryAddress.street}, ${config.deliveryAddress.district}, ${config.deliveryAddress.city}`;
  }, [config.deliveryAddress, isPickup]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;

        const payload = await response.json();
        const nextCustomer = payload.customer as Customer;
        setCustomer(nextCustomer);
        setFormData((current) => ({
          ...current,
          name: current.name || nextCustomer.name,
          phone: current.phone || nextCustomer.phone,
          email: current.email || nextCustomer.email || "",
          birthday:
            current.birthday ||
            nextCustomer.personalization.birthday ||
            nextCustomer.birthday ||
            "",
          gender: current.gender || nextCustomer.gender || "",
        }));

        if (!config.deliveryAddress) {
          const defaultAddress = nextCustomer.personalization.defaultDeliveryAddress;
          if (defaultAddress) {
            setDeliveryAddress({ street: defaultAddress, district: "", city: "" });
          }
        }
      } catch (err) {
        console.error("Failed to load checkout customer:", err);
      } finally {
        setHasLoadedCustomer(true);
      }
    }

    loadCustomer();
  }, [config.deliveryAddress, setDeliveryAddress]);

  useEffect(() => {
    if (isClient && items.length === 0) router.push("/cart");
  }, [isClient, items.length, router]);

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-main">
        <p className="text-sm font-bold text-text-muted">Đang tải...</p>
      </main>
    );
  }

  if (items.length === 0) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submittedPhone = formData.phone || customer?.phone || "";
      const phoneError = getPhoneError(submittedPhone);
      if (phoneError) {
        setError(phoneError);
        return;
      }

      const deliveryAddressString =
        !isPickup && config.deliveryAddress
          ? `${config.deliveryAddress.street}, ${config.deliveryAddress.district}, ${config.deliveryAddress.city}`
          : undefined;

      const pickupTimeDate =
        config.orderTiming.type === "scheduled" &&
        config.orderTiming.scheduledDate &&
        config.orderTiming.scheduledTime
          ? new Date(`${config.orderTiming.scheduledDate}T${config.orderTiming.scheduledTime}`)
          : undefined;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.name || customer?.name,
          customerPhone: submittedPhone,
          customerEmail: formData.email || customer?.email || undefined,
          totalAmount: finalTotal,
          orderType: config.deliveryMode,
          deliveryAddress: deliveryAddressString,
          pickupTime: pickupTimeDate,
          deliveryFee,
          discountAmount: voucherPricing.discountAmount,
          voucherCode: selectedVoucher?.code,
          voucherId: selectedVoucher?.id,
          voucherUseMode: selectedVoucher?.useMode,
          customerBirthday:
            formData.birthday ||
            customer?.personalization.birthday ||
            customer?.birthday ||
            undefined,
          customerGender:
            (formData.gender as Customer["gender"]) ||
            customer?.gender ||
            undefined,
          notes: formData.notes || undefined,
          paymentMethod,
          items,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Failed to create order");
      }

      const order = await response.json();
      clearCart();
      clearSelectedVoucher();
      if (order.payos?.checkoutUrl) {
        window.location.assign(order.payos.checkoutUrl);
        return;
      }
      router.push(`/order-success?orderNumber=${order.orderNumber}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-4 pb-32 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#3d2417] shadow-sm"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#d85d6c]">
              {isPickup ? "Tự đến lấy" : "Giao tận nơi"}
            </p>
            <h1 className="text-xl font-black text-[#3d2417]">Thanh toán</h1>
          </div>
          <div className="h-10 w-10" />
        </header>

        {error && (
          <div className="mb-4 rounded-[16px] border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-[#3d2417]">
              Thông tin khách hàng
            </h2>
            {customer ? (
              <div className="mt-3 rounded-[16px] border border-[#f1dfcf] bg-[#fffaf6] p-3">
                <p className="text-sm font-black text-[#3d2417]">{customer.name}</p>
                <p className="mt-1 text-sm font-semibold text-[#7b6254]">
                  {customer.phone}
                  {customer.email ? ` - ${customer.email}` : ""}
                </p>
                <p
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
                    isPhoneVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isPhoneVerified ? "Số đã được tiệm xác nhận" : "Số chưa xác nhận"}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#9a7a66]">
                  {isPhoneVerified
                    ? "Đơn có thể xử lý theo luồng xanh nếu không có rủi ro khác."
                    : "Nếu đơn có giá trị cao, nhân viên sẽ gọi xác nhận trước khi làm."}
                </p>
              </div>
            ) : !hasLoadedCustomer ? (
              <p className="mt-3 text-sm font-semibold text-[#7b6254]">
                Đang kiểm tra tài khoản...
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <Field
                  label="Họ tên"
                  required
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                />
                <Field
                  label="Số điện thoại"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: sanitizePhone(value) })}
                />
                <p className="text-xs font-semibold text-[#9a7a66]">
                  Tiệm sẽ gọi xác nhận nếu đơn hàng cần kiểm tra thêm.
                </p>
                <Field
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                />
                {selectedVoucher && (
                  <>
                    <Field
                      label="Ngày sinh"
                      type="date"
                      value={formData.birthday}
                      onChange={(value) => setFormData({ ...formData, birthday: value })}
                    />
                    <label className="block">
                      <span className="text-sm font-bold text-[#65483a]">Giới tính</span>
                      <select
                        value={formData.gender}
                        onChange={(event) =>
                          setFormData({ ...formData, gender: event.target.value })
                        }
                        className="mt-1 h-11 w-full rounded-[14px] border border-[#eadbcc] px-3 text-sm outline-none focus:border-[#d85d6c] focus:ring-2 focus:ring-[#d85d6c]/15"
                      >
                        <option value="">Chưa chọn</option>
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                        <option value="other">Khác</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            )}
          </section>

          {selectedVoucher && (
            <section className="rounded-[20px] border border-[#f0b64d] bg-[#fff8ec] p-4 shadow-sm">
              <h2 className="text-base font-black text-[#3d2417]">
                Voucher đang áp dụng
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#7b6254]">
                {selectedVoucher.title}
              </p>
              <p className="mt-2 text-sm font-black text-[#34802f]">
                Giảm {formatPrice(voucherPricing.discountAmount)}
              </p>
              {!voucherPricing.isEligible && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {voucherPricing.reason}
                </p>
              )}
            </section>
          )}

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff4ec] text-[#d85d6c]">
                {isPickup ? <Clock3 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-[#3d2417]">
                  {isPickup ? "Điểm nhận bánh" : "Địa chỉ giao bánh"}
                </h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#7b6254]">
                  {destinationLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-[#3d2417]">Ghi chú</h2>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              rows={3}
              className="mt-3 w-full resize-none rounded-[14px] border border-[#eadbcc] px-3 py-2 text-sm outline-none focus:border-[#d85d6c] focus:ring-2 focus:ring-[#d85d6c]/15"
              placeholder={
                isPickup
                  ? "Ví dụ: Tôi muốn nhận bánh lúc 17:30"
                  : "Ví dụ: Gọi trước khi giao, để bảo vệ nhận giúp..."
              }
            />
          </section>

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-black text-[#3d2417]">
              <ShoppingBag className="h-5 w-5 text-[#d85d6c]" />
              Đơn hàng
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex items-start gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-12 w-12 rounded-[12px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-[#3d2417]">
                      {item.productName} x{item.quantity}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.selectedSize && `Size ${item.selectedSize}`}
                      {item.selectedFlavor && ` - Vị ${item.selectedFlavor}`}
                    </p>
                  </div>
                  <p className="text-sm font-black text-[#3d2417]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-[#f0dfd4] pt-4">
              <SummaryRow label="Tạm tính" value={formatPrice(totalPrice)} />
              {voucherPricing.discountAmount > 0 && (
                <SummaryRow
                  label="Voucher"
                  value={`-${formatPrice(voucherPricing.discountAmount)}`}
                />
              )}
              <SummaryRow
                label={isPickup ? "Phí nhận tại quán" : "Phí vận chuyển"}
                value={deliveryFee === 0 ? "Miễn phí" : formatPrice(deliveryFee)}
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-base font-black text-[#3d2417]">
                  Tổng cộng
                </span>
                <span className="text-2xl font-black text-[#d85d6c]">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-[#3d2417]">
              PhÆ°Æ¡ng thá»©c thanh toĂ¡n
            </h2>
            <div className="mt-3 grid gap-2">
              <PaymentMethodButton
                active={paymentMethod === "cod"}
                icon={<CreditCard className="h-5 w-5" />}
                title={isPickup ? "Thanh toĂ¡n táº¡i quáº§y" : "Thanh toĂ¡n khi nháº­n bĂ¡nh"}
                description="Tiá»‡m xĂ¡c nháº­n Ä‘Æ¡n trÆ°á»›c, báº¡n thanh toĂ¡n sau."
                onClick={() => setPaymentMethod("cod")}
              />
              <PaymentMethodButton
                active={paymentMethod === "bank_transfer"}
                icon={<QrCode className="h-5 w-5" />}
                title="Chuyá»ƒn khoáº£n PayOS"
                description="QuĂ©t QR/chuyá»ƒn khoáº£n qua PayOS, há»‡ thá»‘ng tá»± Ä‘á»‘i soĂ¡t."
                onClick={() => setPaymentMethod("bank_transfer")}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-[16px] bg-[#d85d6c] text-[15px] font-black text-white shadow-[0_8px_18px_rgba(216,93,108,0.26)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#d8c8bd]"
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isPickup
                ? "Xác nhận đơn đến lấy"
                : "Xác nhận đơn giao tận nơi"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  maxLength,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric";
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#65483a]">
        {label}
        {required && " *"}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-[14px] border border-[#eadbcc] px-3 text-sm outline-none focus:border-[#d85d6c] focus:ring-2 focus:ring-[#d85d6c]/15"
      />
    </label>
  );
}

function PaymentMethodButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[16px] border p-3 text-left transition ${
        active
          ? "border-[#d85d6c] bg-[#fff1f0]"
          : "border-[#eadbcc] bg-[#fffaf6] hover:border-[#d85d6c]/40"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${
          active ? "bg-white text-[#d85d6c]" : "bg-white text-[#7b6254]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[#3d2417]">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#7b6254]">
          {description}
        </span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm font-semibold text-text-muted">
      <span>{label}</span>
      <span className="text-[#3d2417]">{value}</span>
    </div>
  );
}
