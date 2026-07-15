import { NextResponse } from "next/server";

import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { getCustomerByPhone } from "@/lib/firebase";
import { listCustomerPasskeys } from "@/lib/firebase/customer-passkeys";
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
} from "@/lib/security/security-events";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: unknown };
    const phone =
      typeof body.phone === "string" ? normalizePhoneInput(body.phone) : "";
    const phoneError = getVietnamPhoneValidationError(phone);

    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const limit = await consumeSecurityAction(
      "phone_recognition",
      buildRiskContext(request, { phone }),
      [
        { subject: "visitor", max: 12, windowMs: 15 * 60_000 },
        { subject: "network", max: 40, windowMs: 15 * 60_000 },
      ],
    );
    if (!limit.allowed) return createSecurityLimitResponse(limit);

    const customer = await getCustomerByPhone(phone);
    const passkeys = customer ? await listCustomerPasskeys(customer.id) : [];

    return NextResponse.json({
      ok: true,
      verificationRequired: Boolean(customer?.hasPassword),
      passkeyAvailable: passkeys.length > 0,
    });
  } catch (error) {
    console.error("Checkout phone recognition failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra số điện thoại lúc này." },
      { status: 500 },
    );
  }
}
