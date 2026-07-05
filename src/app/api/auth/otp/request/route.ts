import { NextResponse } from "next/server";

import { getCustomerByPhone } from "@/lib/firebase";
import { requestCustomerOtp } from "@/lib/firebase/customer-otp";

export async function POST(request: Request) {
  try {
    const { phone, name, birthday, gender, email } = await request.json();

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại." },
        { status: 400 },
      );
    }

    const existingCustomer = await getCustomerByPhone(phone);
    if (!existingCustomer && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({
        ok: false,
        requiresProfile: true,
        message: "Số này chưa có hồ sơ. Vui lòng nhập thêm tên để nhận ưu đãi.",
      });
    }

    const result = await requestCustomerOtp({
      name: typeof name === "string" && name.trim() ? name : existingCustomer?.name ?? "",
      phone,
      email: typeof email === "string" ? email : undefined,
      birthday: typeof birthday === "string" ? birthday : undefined,
      gender:
        gender === "male" || gender === "female" || gender === "other"
          ? gender
          : undefined,
      personalization: {},
    });

    return NextResponse.json({
      ok: true,
      requiresProfile: false,
      expiresAt: result.expiresAt,
      message: "Mã OTP đã được gửi về số điện thoại của bạn.",
      devOtp: process.env.NODE_ENV === "production" ? undefined : result.otp,
    });
  } catch (error) {
    console.error("Request OTP failed:", error);
    return NextResponse.json(
      { error: "Không thể gửi OTP. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
