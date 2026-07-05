import { NextResponse } from "next/server";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { createOrUpdateCustomerFromPurchase, getCustomerByPhone } from "@/lib/firebase";
import { db } from "@/lib/firebase/config";
import { calculateVoucherPricing, getVoucherByCode } from "@/lib/vouchers";

const VOUCHER_REDEMPTIONS_COLLECTION = "voucher_redemptions";

export async function POST(request: Request) {
  try {
    const { code, phone, name, birthday, gender, subtotal } = await request.json();

    if (typeof code !== "string" || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Mã voucher và số điện thoại là bắt buộc." },
        { status: 400 },
      );
    }

    const voucher = getVoucherByCode(code);
    if (!voucher || !voucher.channels.includes("pos_pickup_now")) {
      return NextResponse.json(
        { error: "Voucher này không dùng tại quầy." },
        { status: 404 },
      );
    }

    const numericSubtotal = Number(subtotal) || 0;
    const pricing = calculateVoucherPricing(numericSubtotal, voucher);

    if (!pricing.isEligible) {
      return NextResponse.json(
        { error: pricing.reason ?? "Đơn chưa đủ điều kiện dùng voucher." },
        { status: 400 },
      );
    }

    const existingCustomer = await getCustomerByPhone(phone);
    const redemptionSnapshot = await getDocs(
      query(
        collection(db, VOUCHER_REDEMPTIONS_COLLECTION),
        where("voucherId", "==", voucher.id),
        where("phone", "==", phone.replace(/\s+/g, "").trim()),
        limit(voucher.maxUsesPerPhone ?? 1),
      ),
    );

    if (
      voucher.maxUsesPerPhone &&
      redemptionSnapshot.size >= voucher.maxUsesPerPhone
    ) {
      return NextResponse.json(
        { error: "Số điện thoại này đã dùng voucher này rồi." },
        { status: 409 },
      );
    }

    const customer = existingCustomer
      ? existingCustomer
      : await createOrUpdateCustomerFromPurchase({
          name: typeof name === "string" && name.trim() ? name : `Khách ${phone}`,
          phone,
          birthday: typeof birthday === "string" ? birthday : undefined,
          gender:
            gender === "male" || gender === "female" || gender === "other"
              ? gender
              : undefined,
          status: "active",
          personalization: {},
        });

    await addDoc(collection(db, VOUCHER_REDEMPTIONS_COLLECTION), {
      voucherId: voucher.id,
      voucherCode: voucher.code,
      phone: customer.phone,
      customerId: customer.id,
      channel: "pos_pickup_now",
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAfterDiscount: pricing.totalAfterDiscount,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      voucher,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      pricing,
    });
  } catch (error) {
    console.error("POS voucher redeem failed:", error);
    return NextResponse.json(
      { error: "Không thể áp voucher tại quầy." },
      { status: 500 },
    );
  }
}
