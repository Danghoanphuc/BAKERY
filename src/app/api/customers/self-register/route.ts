import { NextResponse } from "next/server";

import {
  buildMagicLinkUrl,
  createCustomerWithMagicLink,
  createMagicLinkForCustomer,
  getCustomerByPhone,
} from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { name, phone, birthday, gender } = await request.json();

    if (typeof name !== "string" || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 },
      );
    }

    const existingCustomer = await getCustomerByPhone(phone);
    const result = existingCustomer
      ? await createMagicLinkForCustomer(existingCustomer.id)
      : await createCustomerWithMagicLink({
          name,
          phone,
          birthday: typeof birthday === "string" ? birthday : undefined,
          gender:
            gender === "male" || gender === "female" || gender === "other"
              ? gender
              : undefined,
          status: "invited",
          loyaltyPoints: 0,
          tier: "new",
        });

    return NextResponse.json({
      ok: true,
      message:
        "Da tao link kich hoat. Khach co the mo link nay tren dien thoai de vao tai khoan.",
      magicLinkUrl: buildMagicLinkUrl(result.urlPath),
    });
  } catch (error) {
    console.error("Self register failed:", error);
    return NextResponse.json(
      { error: "Khong the tao tai khoan." },
      { status: 500 },
    );
  }
}
