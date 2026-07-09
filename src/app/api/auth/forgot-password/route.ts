import { NextResponse } from "next/server";

import {
  buildMagicLinkUrl,
  createMagicLinkForCustomer,
  getCustomerByPhone,
} from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Vui long nhap so dien thoai." },
        { status: 400 },
      );
    }

    const customer = await getCustomerByPhone(phone);
    if (!customer) {
      return NextResponse.json({
        ok: true,
        message:
          "Nếu số điện thoại đã có hồ sơ, nhân viên sẽ hỗ trợ gửi link đăng nhập.",
      });
    }

    const result = await createMagicLinkForCustomer(customer.id);

    return NextResponse.json({
      ok: true,
      message:
        "Đã tạo link đăng nhập mới. Nhân viên có thể gửi link này cho khách để đặt lại mật khẩu.",
      magicLinkUrl: buildMagicLinkUrl(result.urlPath),
    });
  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo link hỗ trợ đăng nhập." },
      { status: 500 },
    );
  }
}
