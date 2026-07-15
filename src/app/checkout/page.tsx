"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AddressModal } from "@/components/layout/Header/AddressModal";
import { TurnstileChallenge } from "@/components/security/TurnstileChallenge";
import { getPhoneError, sanitizePhone } from "@/features/auth/pin-ui";
import {
  CheckoutContactSheet,
  CheckoutFulfillmentCard,
  CheckoutHeader,
  CheckoutNoteField,
  CheckoutOrderItemsSheet,
  CheckoutOrderSummary,
  CheckoutPaymentSelector,
  CheckoutStickyBar,
  CheckoutVoucherRow,
  type CheckoutPaymentMethod,
} from "@/features/checkout/components";
import {
  getAddressText,
  getDefaultAddress,
  getDestinationLabel,
  getScheduledOrderTime,
  getTimingLabel,
  toDeliveryAddress,
} from "@/features/checkout/checkout-utils";
import { useCheckoutIdentity } from "@/features/checkout/useCheckoutIdentity";
import { CustomerVoucherPicker } from "@/features/vouchers";
import { getShippingBenefit } from "@/lib/order-pricing";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import type { Customer } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, totalQuantity, clearCart } = useCartStore();
  const { config, setDeliveryAddress } = useOrderConfigStore();
  const { selectedVoucher, clearSelectedVoucher } = useVoucherStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("cod");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedOrder, setHasSubmittedOrder] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityChallenge, setSecurityChallenge] = useState<{
    siteKey: string;
    action: string;
  } | null>(null);

  const isPickup = config.deliveryMode === "pickup";
  const voucherPricing = calculateVoucherPricing(totalPrice, selectedVoucher);
  const deliveryFee = getShippingBenefit(totalPrice, config.deliveryMode).fee;
  const finalTotal = voucherPricing.totalAfterDiscount + deliveryFee;
  const destinationLabel = useMemo(
    () => getDestinationLabel(config, isPickup),
    [config, isPickup],
  );
  const timingLabel = useMemo(
    () => getTimingLabel(config, isPickup),
    [config, isPickup],
  );

  const applyAuthenticatedCustomer = useCallback(
    (nextCustomer: Customer, preserveEnteredContact = false) => {
      setError(null);
      setCustomer(nextCustomer);
      setContact((current) =>
        preserveEnteredContact
          ? {
              name: current.name || nextCustomer.name,
              phone: current.phone || nextCustomer.phone,
            }
          : { name: nextCustomer.name, phone: nextCustomer.phone },
      );

      if (useOrderConfigStore.getState().config.deliveryAddress) return;

      const savedAddress = getDefaultAddress(
        nextCustomer.personalization.addressBook,
      );
      if (savedAddress) {
        setDeliveryAddress(toDeliveryAddress(savedAddress));
      } else if (nextCustomer.personalization.defaultDeliveryAddress) {
        setDeliveryAddress({
          street: nextCustomer.personalization.defaultDeliveryAddress,
          district: "",
          city: "",
          formattedAddress:
            nextCustomer.personalization.defaultDeliveryAddress,
        });
      }
    },
    [setDeliveryAddress],
  );

  const checkoutIdentity = useCheckoutIdentity({
    phone: contact.phone,
    isAuthenticated: Boolean(customer),
    onAuthenticated: applyAuthenticatedCustomer,
  });

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;

        const payload = await response.json();
        const nextCustomer = payload.customer as Customer;
        applyAuthenticatedCustomer(nextCustomer, true);
      } catch (loadError) {
        console.error("Failed to load checkout customer:", loadError);
      }
    }

    void loadCustomer();
  }, [applyAuthenticatedCustomer]);

  useEffect(() => {
    if (isClient && items.length === 0 && !hasSubmittedOrder) {
      router.push("/cart");
    }
  }, [hasSubmittedOrder, isClient, items.length, router]);

  if (!isClient) return <CheckoutLoading />;
  if (items.length === 0) return null;

  const handleSubmit = async (
    event?: React.FormEvent,
    securityChallengeToken?: string,
  ) => {
    event?.preventDefault();
    setError(null);

    if (!contact.name.trim()) {
      setError("Vui lòng nhập tên người nhận.");
      setIsContactOpen(true);
      return;
    }

    const phoneError = getPhoneError(contact.phone);
    if (phoneError) {
      setError(phoneError);
      setIsContactOpen(true);
      return;
    }

    if (!isPickup && !config.deliveryAddress) {
      setError("Vui lòng chọn địa chỉ giao bánh.");
      setIsAddressOpen(true);
      return;
    }

    if (selectedVoucher && !voucherPricing.isEligible) {
      setError(
        voucherPricing.reason || "Voucher hiện không còn phù hợp với đơn hàng.",
      );
      setIsVoucherOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const pickupTime = getScheduledOrderTime(config);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: contact.name.trim(),
          customerPhone: contact.phone,
          customerEmail: customer?.email || undefined,
          totalAmount: finalTotal,
          orderType: config.deliveryMode,
          deliveryAddress:
            !isPickup && config.deliveryAddress
              ? getAddressText(config.deliveryAddress)
              : undefined,
          deliveryAddressDetails: !isPickup
            ? config.deliveryAddress
            : undefined,
          pickupTime,
          deliveryFee,
          discountAmount: voucherPricing.discountAmount,
          voucherCode: selectedVoucher?.code,
          voucherId: selectedVoucher?.id,
          voucherUseMode: selectedVoucher?.useMode,
          notes: notes.trim() || undefined,
          paymentMethod,
          items,
          securityChallengeToken,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (
          payload?.code === "challenge_required" &&
          typeof payload.siteKey === "string" &&
          typeof payload.action === "string"
        ) {
          setSecurityChallenge({
            siteKey: payload.siteKey,
            action: payload.action,
          });
          return;
        }
        if (payload?.code === "account_exists") {
          checkoutIdentity.retryRecognition();
          setIsContactOpen(true);
        }
        throw new Error(payload?.error || "Không thể tạo đơn hàng.");
      }

      const order = await response.json();
      setHasSubmittedOrder(true);
      clearCart();
      clearSelectedVoucher();
      router.push(`/order?orderId=${encodeURIComponent(order.id)}`);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-3.5 pb-40 pt-2">
        <CheckoutHeader isPickup={isPickup} onBack={() => router.back()} />

        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <CheckoutFulfillmentCard
            isPickup={isPickup}
            customerName={contact.name}
            customerPhone={contact.phone}
            isPhoneVerified={Boolean(customer?.phoneVerifiedAt)}
            destinationLabel={destinationLabel}
            timingLabel={timingLabel}
            onEditContact={() => setIsContactOpen(true)}
            onEditDestination={
              isPickup ? undefined : () => setIsAddressOpen(true)
            }
          />

          <CheckoutVoucherRow
            code={selectedVoucher?.code}
            title={selectedVoucher?.title}
            discountAmount={voucherPricing.discountAmount}
            eligibilityReason={voucherPricing.reason}
            isEligible={voucherPricing.isEligible}
            onChoose={() => setIsVoucherOpen(true)}
            onClear={clearSelectedVoucher}
          />

          <CheckoutPaymentSelector
            value={paymentMethod}
            isPickup={isPickup}
            onChange={setPaymentMethod}
          />

          <CheckoutOrderSummary
            itemCount={items.length}
            totalQuantity={totalQuantity}
            productSubtotal={totalPrice}
            discountAmount={voucherPricing.discountAmount}
            deliveryFee={deliveryFee}
            finalTotal={finalTotal}
            isPickup={isPickup}
            onViewItems={() => setIsItemsOpen(true)}
          />

          <CheckoutNoteField
            value={notes}
            isPickup={isPickup}
            onChange={setNotes}
          />

          <CheckoutStickyBar
            finalTotal={finalTotal}
            discountAmount={voucherPricing.discountAmount}
            isPickup={isPickup}
            isSubmitting={isSubmitting}
          />
        </form>
      </div>

      <CheckoutContactSheet
        isOpen={isContactOpen}
        value={contact}
        onChange={(next) =>
          setContact({ ...next, phone: sanitizePhone(next.phone) })
        }
        onClose={() => setIsContactOpen(false)}
        identityStatus={checkoutIdentity.status}
        pin={checkoutIdentity.pin}
        identityError={checkoutIdentity.error}
        onPinChange={checkoutIdentity.setPin}
        onSignIn={checkoutIdentity.signIn}
      />
      <CustomerVoucherPicker
        isOpen={isVoucherOpen}
        subtotal={totalPrice}
        onClose={() => setIsVoucherOpen(false)}
      />
      <CheckoutOrderItemsSheet
        isOpen={isItemsOpen}
        items={items}
        onClose={() => setIsItemsOpen(false)}
        onEditCart={() => router.push("/cart")}
      />
      <AddressModal
        isOpen={isAddressOpen}
        onClose={() => setIsAddressOpen(false)}
      />
      {securityChallenge ? (
        <TurnstileChallenge
          siteKey={securityChallenge.siteKey}
          action={securityChallenge.action}
          onCancel={() => setSecurityChallenge(null)}
          onToken={(token) => {
            if (!token) return;
            setSecurityChallenge(null);
            void handleSubmit(undefined, token);
          }}
        />
      ) : null}
      {!securityChallenge && checkoutIdentity.securityChallenge ? (
        <TurnstileChallenge
          siteKey={checkoutIdentity.securityChallenge.siteKey}
          action={checkoutIdentity.securityChallenge.action}
          onCancel={checkoutIdentity.cancelSecurityChallenge}
          onToken={(token) => {
            if (!token) return;
            void checkoutIdentity.completeSecurityChallenge(token);
          }}
        />
      ) : null}
    </main>
  );
}

function CheckoutLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-main">
      <p className="text-sm font-bold text-text-muted">Đang tải...</p>
    </main>
  );
}
