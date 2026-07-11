"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  KeyRound,
  LocateFixed,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import { formatPrice } from "@/lib/utils";
import { getShippingBenefit } from "@/lib/order-pricing";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { getPhoneError, sanitizePhone } from "@/features/auth/pin-ui";
import PinSetupFlow from "@/features/auth/PinSetupFlow";
import {
  getCartItemFlavorLabel,
  getCartItemSizeLabel,
  type Customer,
  type CustomerAddressBookEntry,
  type OrderConfig,
} from "@/types";

function getAddressText(address?: OrderConfig["deliveryAddress"]) {
  if (!address) return "";
  return (
    address.formattedAddress ||
    [address.street, address.district, address.city].filter(Boolean).join(", ")
  );
}

function getDefaultAddress(addressBook?: CustomerAddressBookEntry[]) {
  if (!addressBook || addressBook.length === 0) return undefined;
  return addressBook.find((address) => address.isDefault) || addressBook[0];
}

function toDeliveryAddress(
  address: CustomerAddressBookEntry,
): NonNullable<OrderConfig["deliveryAddress"]> {
  return {
    street: address.street,
    district: address.district,
    city: address.city,
    lat: address.lat,
    lng: address.lng,
    formattedAddress: address.formattedAddress,
    placeId: address.placeId,
  };
}

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
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">(
    "cod",
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedOrder, setHasSubmittedOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const isPickup = config.deliveryMode === "pickup";
  const voucherPricing = calculateVoucherPricing(totalPrice, selectedVoucher);
  const deliveryFee = getShippingBenefit(totalPrice, config.deliveryMode).fee;
  const finalTotal = voucherPricing.totalAfterDiscount + deliveryFee;
  const isPhoneVerified = Boolean(customer?.phoneVerifiedAt);

  const destinationLabel = useMemo(() => {
    if (isPickup) return "Nhận tại cửa hàng chính";
    if (!config.deliveryAddress) return "Chưa chọn địa chỉ giao hàng";
    return getAddressText(config.deliveryAddress);
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
        }));

        if (!config.deliveryAddress) {
          const savedAddress = getDefaultAddress(
            nextCustomer.personalization.addressBook,
          );

          if (savedAddress) {
            setDeliveryAddress(toDeliveryAddress(savedAddress));
          } else {
            const defaultAddress =
              nextCustomer.personalization.defaultDeliveryAddress;
            if (defaultAddress) {
              setDeliveryAddress({
                street: defaultAddress,
                district: "",
                city: "",
                formattedAddress: defaultAddress,
              });
            }
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
    if (isClient && items.length === 0 && !hasSubmittedOrder) {
      router.push("/cart");
    }
  }, [hasSubmittedOrder, isClient, items.length, router]);

  const handlePinComplete = useCallback(async (pin: string) => {
    if (!pendingOrder || isSavingPin) return;
    setIsSavingPin(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể lưu mã PIN.");
      }
      const completedOrderId = pendingOrder.id;
      setPendingOrder(null);
      router.replace(`/order?orderId=${encodeURIComponent(completedOrderId)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu mã PIN.");
    } finally {
      setIsSavingPin(false);
    }
  }, [isSavingPin, pendingOrder, router]);

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-main">
        <p className="text-sm font-bold text-text-muted">Đang tải...</p>
      </main>
    );
  }

  if (pendingOrder) {
    return (
      <PostOrderPinSetup
        orderNumber={pendingOrder.orderNumber}
        error={error}
        isSaving={isSavingPin}
        onComplete={handlePinComplete}
      />
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
          ? getAddressText(config.deliveryAddress)
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
          customerEmail: customer?.email || undefined,
          totalAmount: finalTotal,
          orderType: config.deliveryMode,
          deliveryAddress: deliveryAddressString,
          deliveryAddressDetails: !isPickup ? config.deliveryAddress : undefined,
          pickupTime: pickupTimeDate,
          deliveryFee,
          discountAmount: voucherPricing.discountAmount,
          voucherCode: selectedVoucher?.code,
          voucherId: selectedVoucher?.id,
          voucherUseMode: selectedVoucher?.useMode,
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
      setHasSubmittedOrder(true);
      clearCart();
      clearSelectedVoucher();
      if (customer) {
        router.push(`/order?orderId=${encodeURIComponent(order.id)}`);
        return;
      }
      setPendingOrder({ id: order.id, orderNumber: order.orderNumber });
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
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#b84a39]">
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
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff4ec] text-[#b84a39]">
                {isPickup ? <Clock3 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-black text-[#3d2417]">
                    {isPickup ? "Điểm nhận bánh" : "Địa chỉ giao bánh"}
                  </h2>
                  {!isPickup && (
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] bg-[#fff1f0] px-2.5 text-xs font-black text-[#b84a39]"
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      Chỉnh vị trí
                    </button>
                  )}
                </div>
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
              className="mt-3 w-full resize-none rounded-[14px] border border-[#eadbcc] px-3 py-2 text-sm outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
              placeholder={
                isPickup
                  ? "Ví dụ: Tôi muốn nhận bánh lúc 17:30"
                  : "Ví dụ: Gọi trước khi giao, để bảo vệ nhận giúp..."
              }
            />
          </section>

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-black text-[#3d2417]">
              <ShoppingBag className="h-5 w-5 text-[#b84a39]" />
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
                      {getCartItemSizeLabel(item) &&
                        `Size ${getCartItemSizeLabel(item)}`}
                      {getCartItemFlavorLabel(item) &&
                        ` - Vị ${getCartItemFlavorLabel(item)}`}
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
                <span className="text-2xl font-black text-[#b84a39]">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#f0dfcc] bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-[#3d2417]">
              Phương thức thanh toán
            </h2>
            <div className="mt-3 grid gap-2">
              <PaymentMethodButton
                active={paymentMethod === "cod"}
                icon={<CreditCard className="h-5 w-5" />}
                title={isPickup ? "Thanh toán tại quầy" : "Thanh toán khi nhận bánh"}
                description="Tiệm xác nhận đơn trước, bạn thanh toán sau."
                onClick={() => setPaymentMethod("cod")}
              />
              <PaymentMethodButton
                active={paymentMethod === "bank_transfer"}
                icon={<QrCode className="h-5 w-5" />}
                title="Thanh toán chuyển khoản"
                description="Quét QR hoặc lưu ảnh QR để chuyển khoản, hệ thống tự đối soát."
                onClick={() => setPaymentMethod("bank_transfer")}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-[16px] bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_18px_rgba(184,74,57,0.26)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#d8c8bd]"
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isPickup
                ? "Xác nhận đơn đến lấy"
                : "Xác nhận đơn giao tận nơi"}
          </button>
        </form>
      </div>
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </main>
  );
}

function PostOrderPinSetup({
  orderNumber,
  error,
  isSaving,
  onComplete,
}: {
  orderNumber: string;
  error: string | null;
  isSaving: boolean;
  onComplete: (pin: string) => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <section className="w-full max-w-[440px] rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-[0_18px_50px_rgba(83,38,12,0.12)]">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[#b84a39] text-white">
            <KeyRound className="h-7 w-7" />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.08em] text-[#b84a39]">
            Đã tạo đơn #{orderNumber}
          </p>
          <h1 className="mt-1 text-2xl font-black">Tạo mã PIN đăng nhập</h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#7b6254]">
            Hoàn tất bước này để lưu tài khoản và xem ngay đơn hàng vừa đặt.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3">
          <PinSetupFlow
            key={error || "pin-setup"}
            onComplete={onComplete}
            isLoading={isSaving}
          />
        </div>

        {isSaving && (
          <p className="text-center text-xs font-bold text-[#9a7a66]">
            Đang lưu mã PIN và mở đơn hàng...
          </p>
        )}
      </section>
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
        className="mt-1 h-11 w-full rounded-[14px] border border-[#eadbcc] px-3 text-sm outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
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
          ? "border-[#b84a39] bg-[#fff1f0]"
          : "border-[#eadbcc] bg-[#fffaf6] hover:border-[#b84a39]/40"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${
          active ? "bg-white text-[#b84a39]" : "bg-white text-[#7b6254]"
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
