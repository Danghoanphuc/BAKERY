import { NextResponse } from "next/server";

import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { getCustomerByPhone } from "@/lib/firebase/customers";
import { listCustomerPasskeys } from "@/lib/firebase/customer-passkeys";
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
} from "@/lib/security/security-events";

export async function POST(request: Request) {
  const body = await request.json();
  const phone =
    typeof body.phone === "string" ? normalizePhoneInput(body.phone) : "";
  const phoneError = getVietnamPhoneValidationError(phone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }

  const limit = await consumeSecurityAction(
    "passkey_status_request",
    buildRiskContext(request, { phone }),
    [
      { subject: "visitor", max: 20, windowMs: 15 * 60_000 },
      { subject: "network", max: 40, windowMs: 15 * 60_000 },
    ],
  );
  if (!limit.allowed) return createSecurityLimitResponse(limit);

  const customer = await getCustomerByPhone(phone);
  const passkeys = customer ? await listCustomerPasskeys(customer.id) : [];
  return NextResponse.json({ available: passkeys.length > 0 });
}
