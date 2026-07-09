import { NextResponse } from "next/server";

import {
  buildMagicLinkUrl,
  createMagicLinkForCustomer,
  getCustomerByPhone,
} from "@/lib/firebase";
import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const normalizedPhone =
      typeof phone === "string" ? normalizePhoneInput(phone) : "";

    const phoneError = getVietnamPhoneValidationError(normalizedPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const customer = await getCustomerByPhone(normalizedPhone);

    if (customer) {
      const result = await createMagicLinkForCustomer(customer.id);

      return NextResponse.json({
        ok: true,
        message:
          "Hệ thống đã tạo link đăng nhập mới. Nhân viên có thể gửi link này cho khách.",
        magicLinkUrl: buildMagicLinkUrl(result.urlPath),
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Nếu số điện thoại đã có trong CRM, hệ thống đã tạo magic link mới để nhân viên gửi cho khách.",
    });
  } catch (error) {
    console.error("Phone login request failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo yêu cầu đăng nhập." },
      { status: 500 },
    );
  }
}
