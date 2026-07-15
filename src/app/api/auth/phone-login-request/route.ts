import { NextResponse } from "next/server";

import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
} from "@/lib/security/security-events";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const normalizedPhone =
      typeof phone === "string" ? normalizePhoneInput(phone) : "";

    const phoneError = getVietnamPhoneValidationError(normalizedPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const limit = await consumeSecurityAction(
      "magic_link_request",
      buildRiskContext(request, { phone: normalizedPhone }),
      [
        { subject: "phone", max: 3, windowMs: 60 * 60_000 },
        { subject: "visitor", max: 5, windowMs: 60 * 60_000 },
        { subject: "network", max: 20, windowMs: 60 * 60_000 },
      ],
    );
    if (!limit.allowed) return createSecurityLimitResponse(limit);

    return NextResponse.json({
      ok: true,
      message:
        "Yêu cầu đã được ghi nhận. Vui lòng liên hệ tiệm để được hỗ trợ đăng nhập an toàn.",
    });
  } catch (error) {
    console.error("Phone login request failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo yêu cầu đăng nhập." },
      { status: 500 },
    );
  }
}
