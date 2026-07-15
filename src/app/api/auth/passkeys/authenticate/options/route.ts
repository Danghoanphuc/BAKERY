import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { normalizePhoneInput, getVietnamPhoneValidationError } from "@/lib/auth/phone";
import { createPasskeyChallengeCookie, getPasskeyConfig } from "@/lib/auth/passkey";
import { getCustomerByPhone } from "@/lib/firebase/customers";
import { createPasskeyChallenge, listCustomerPasskeys } from "@/lib/firebase/customer-passkeys";
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
} from "@/lib/security/security-events";

export async function POST(request: Request) {
  const body = await request.json();
  const phone = typeof body.phone === "string" ? normalizePhoneInput(body.phone) : "";
  const error = getVietnamPhoneValidationError(phone);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const limit = await consumeSecurityAction(
    "passkey_options_request",
    buildRiskContext(request, { phone }),
    [
      { subject: "phone", max: 10, windowMs: 15 * 60_000 },
      { subject: "visitor", max: 20, windowMs: 15 * 60_000 },
      { subject: "network", max: 40, windowMs: 15 * 60_000 },
    ],
  );
  if (!limit.allowed) return createSecurityLimitResponse(limit);

  const customer = await getCustomerByPhone(phone);
  const passkeys = customer ? await listCustomerPasskeys(customer.id) : [];
  const config = getPasskeyConfig();
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    userVerification: "required",
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
  });
  const rawChallengeId = await createPasskeyChallenge({
    challenge: options.challenge,
    purpose: "authentication",
    customerId: customer?.id,
  });
  const response = NextResponse.json(options);
  response.headers.append("Set-Cookie", createPasskeyChallengeCookie(rawChallengeId));
  return response;
}
