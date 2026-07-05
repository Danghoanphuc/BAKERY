import { NextResponse } from "next/server";

import { getCustomerByPhone } from "@/lib/firebase";
import { requestCustomerOtp } from "@/lib/firebase/customer-otp";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại." },
        { status: 400 },
      );
    }

    const customer = await getCustomerByPhone(phone);
    if (!customer) {
      return NextResponse.json({
        ok: true,
        message:
          "Nếu số điện thoại đã có hồ sơ, tiệm sẽ gửi OTP để đặt lại mật khẩu.",
      });
    }

    const result = await requestCustomerOtp({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      birthday: customer.birthday,
      gender: customer.gender,
      personalization: customer.personalization,
    });

    return NextResponse.json({
      ok: true,
      message: "OTP đặt lại mật khẩu đã được gửi về số điện thoại.",
      next: "/account/password?reset=1",
      devOtp: process.env.NODE_ENV === "production" ? undefined : result.otp,
    });
  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json(
      { error: "Không thể gửi OTP đặt lại mật khẩu." },
      { status: 500 },
    );
  }
}
