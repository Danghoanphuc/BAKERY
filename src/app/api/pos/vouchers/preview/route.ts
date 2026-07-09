import { NextResponse } from "next/server";
import { getCustomerById, getCustomerByPhone, getMarketingCampaigns } from "@/lib/firebase";
import {
  getPublicVouchers,
  getPublicVouchersFromCampaigns,
  getVoucherByCodeFromCampaigns,
} from "@/lib/vouchers";
import { getVoucherCodeFromScanInput, parsePosVoucherToken } from "@/lib/pos-voucher-token";
import { validateVoucherRedemption } from "@/lib/voucher-redemption-policy";
import type { PublicVoucher, VoucherUseMode } from "@/types/voucher";

type PreviewRequest = {
  code?: string;
  scanInput?: string;
  customerId?: string;
  phone?: string;
  subtotal?: number;
};

async function previewVoucher({
  voucher,
  subtotal,
  customerId,
  phone,
}: {
  voucher: PublicVoucher;
  subtotal: number;
  customerId?: string;
  phone?: string;
}) {
  const validation = await validateVoucherRedemption({
    voucher,
    subtotal,
    channel: "pos_pickup_now" as VoucherUseMode,
    customerId,
    phone,
  });

  return {
    voucher,
    ok: validation.ok,
    pricing: validation.ok ? validation.pricing : undefined,
    reason: validation.ok ? undefined : validation.error,
    estimatedDiscount: validation.ok ? validation.pricing.discountAmount : 0,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PreviewRequest;
    const subtotal = Math.max(0, Number(payload.subtotal) || 0);
    const campaigns = await getMarketingCampaigns();
    const token = payload.scanInput ? parsePosVoucherToken(payload.scanInput) : null;
    const code =
      payload.scanInput
        ? getVoucherCodeFromScanInput(payload.scanInput)
        : payload.code?.trim().toUpperCase();
    const requestedCustomerId = payload.customerId ?? token?.customerId;
    const requestedPhone = payload.phone ?? token?.customerPhone;
    const customer = requestedCustomerId
      ? await getCustomerById(requestedCustomerId)
      : requestedPhone
        ? await getCustomerByPhone(requestedPhone)
        : null;
    const customerId = customer?.id ?? requestedCustomerId;
    const phone = customer?.phone ?? requestedPhone;
    const tokenCustomer =
      token?.customerPhone || token?.customerName
        ? {
            id: token.customerId,
            name: token.customerName ?? "Khách mới",
            phone: token.customerPhone ?? "",
            loyaltyPoints: 0,
            tier: "new",
            totalOrders: 0,
            isNew: true,
          }
        : null;
    const allVouchers = [
      ...getPublicVouchersFromCampaigns(campaigns),
      ...getPublicVouchers(),
    ].filter((voucher, index, list) => {
      return (
        voucher.channels.includes("pos_pickup_now") &&
        list.findIndex((item) => item.id === voucher.id) === index
      );
    });

    if (code) {
      const voucher = getVoucherByCodeFromCampaigns(code, campaigns);
      if (!voucher || !voucher.channels.includes("pos_pickup_now")) {
        return NextResponse.json(
          { error: "Voucher không dùng tại quầy." },
          { status: 404 },
        );
      }

      const preview = await previewVoucher({
        voucher,
        subtotal,
        customerId,
        phone,
      });

      return NextResponse.json({
        ...preview,
        token,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              loyaltyPoints: customer.loyaltyPoints,
              tier: customer.tier,
              isNew: false,
            }
          : tokenCustomer,
      });
    }

    const previews = await Promise.all(
      allVouchers.map((voucher) =>
        previewVoucher({ voucher, subtotal, customerId, phone }),
      ),
    );
    const eligible = previews
      .filter((preview) => preview.ok)
      .sort((left, right) => right.estimatedDiscount - left.estimatedDiscount);

    return NextResponse.json({
      suggestions: previews
        .sort((left, right) => right.estimatedDiscount - left.estimatedDiscount)
        .slice(0, 4),
      best: eligible[0] ?? null,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            loyaltyPoints: customer.loyaltyPoints,
            tier: customer.tier,
            isNew: false,
          }
        : tokenCustomer,
    });
  } catch (error) {
    console.error("POS voucher preview failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra voucher." },
      { status: 500 },
    );
  }
}
