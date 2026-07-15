import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  hasRecentStrongAuthentication,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import {
  createPasskeyChallengeCookie,
  getPasskeyConfig,
} from "@/lib/auth/passkey";
import { getCustomerById } from "@/lib/firebase/customers";
import {
  createPasskeyChallenge,
  listCustomerPasskeys,
} from "@/lib/firebase/customer-passkeys";

export async function POST(request: Request) {
  const session = await parseCustomerSessionValue(
    readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE),
  );
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRecentStrongAuthentication(session)) {
    return NextResponse.json(
      {
        error: "Vui lòng đăng nhập lại bằng PIN hoặc passkey để liên kết sinh trắc học.",
        code: "recent_auth_required",
      },
      { status: 403 },
    );
  }

  const [customer, passkeys] = await Promise.all([
    getCustomerById(session.customerId),
    listCustomerPasskeys(session.customerId),
  ]);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (passkeys.length >= 10) {
    return NextResponse.json(
      { error: "Tài khoản đã đạt giới hạn 10 passkey." },
      { status: 409 },
    );
  }

  const config = getPasskeyConfig();
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userID: new TextEncoder().encode(customer.id),
    userName: customer.phone,
    userDisplayName: customer.name,
    attestationType: "none",
    excludeCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });
  const rawChallengeId = await createPasskeyChallenge({
    challenge: options.challenge,
    purpose: "registration",
    customerId: customer.id,
  });
  const response = NextResponse.json(options);
  response.headers.append("Set-Cookie", createPasskeyChallengeCookie(rawChallengeId));
  return response;
}
