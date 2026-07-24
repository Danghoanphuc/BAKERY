import { NextResponse } from "next/server";

import {
  createOrUpdateCustomerFromPurchase,
  getCustomerByPhone,
  getMarketingCampaigns,
  recordVoucherRedemption,
} from "@/lib/wholesale-firebase";
import { getVoucherByCodeFromCampaigns } from "@/lib/vouchers";
import { validateVoucherRedemption } from "@/lib/wholesale-voucher-redemption-policy";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { code, phone, name, birthday, gender, subtotal } =
      await request.json();

    if (typeof code !== "string" || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Mã voucher và số điện thoại là bắt buộc." },
        { status: 400 },
      );
    }

    const campaigns = await getMarketingCampaigns();
    const voucher = getVoucherByCodeFromCampaigns(code, campaigns);
    if (!voucher || !voucher.channels.includes("pos_pickup_now")) {
      return NextResponse.json(
        { error: "Voucher này không dùng tại quầy." },
        { status: 404 },
      );
    }

    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    const existingCustomer = await getCustomerByPhone(phone);
    const numericSubtotal = Number(subtotal) || 0;
    const validation = await validateVoucherRedemption({
      voucher,
      subtotal: numericSubtotal,
      channel: "pos_pickup_now",
      customerId: existingCustomer?.id,
      phone: normalizedPhone,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 409 },
      );
    }

    const customer = existingCustomer
      ? existingCustomer
      : await createOrUpdateCustomerFromPurchase({
          name:
            typeof name === "string" && name.trim()
              ? name
              : `Khách ${phone}`,
          phone,
          birthday: typeof birthday === "string" ? birthday : undefined,
          gender:
            gender === "male" || gender === "female" || gender === "other"
              ? gender
              : undefined,
          status: "active",
          personalization: {},
        });

    await recordVoucherRedemption({
      voucherId: voucher.id,
      voucherCode: voucher.code,
      phone: customer.phone,
      customerId: customer.id,
      channel: "pos_pickup_now",
      subtotal: validation.pricing.subtotal,
      discountAmount: validation.pricing.discountAmount,
      totalAfterDiscount: validation.pricing.totalAfterDiscount,
      source: "pos",
    });

    return NextResponse.json({
      ok: true,
      voucher,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      pricing: validation.pricing,
    });
  } catch (error) {
    console.error("POS voucher redeem failed:", error);
    return NextResponse.json(
      { error: "Không thể áp voucher tại quầy." },
      { status: 500 },
    );
  }
}
