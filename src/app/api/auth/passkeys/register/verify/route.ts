import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  hasRecentStrongAuthentication,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import {
  clearPasskeyChallengeCookie,
  getPasskeyConfig,
  readPasskeyChallenge,
} from "@/lib/auth/passkey";
import { getSessionDevice } from "@/lib/auth/session-device";
import {
  consumePasskeyChallenge,
  saveCustomerPasskey,
} from "@/lib/firebase/customer-passkeys";
import { buildRiskContext } from "@/lib/security/risk-context";
import { recordSecurityEvent } from "@/lib/security/security-events";

export async function POST(request: Request) {
  const session = await parseCustomerSessionValue(
    readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE),
  );
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRecentStrongAuthentication(session)) {
    return NextResponse.json(
      {
        error: "Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại bằng PIN.",
        code: "recent_auth_required",
      },
      { status: 403 },
    );
  }

  const rawChallengeId = readPasskeyChallenge(request);
  const challenge = rawChallengeId
    ? await consumePasskeyChallenge(rawChallengeId)
    : null;
  if (
    !challenge ||
    challenge.purpose !== "registration" ||
    challenge.customerId !== session.customerId
  ) {
    return NextResponse.json({ error: "Yêu cầu passkey đã hết hạn." }, { status: 400 });
  }

  const body = (await request.json()) as {
    response: RegistrationResponseJSON;
    name?: string;
  };
  const config = getPasskeyConfig();
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    requireUserVerification: true,
  }).catch(() => null);
  if (!verification?.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Không thể xác minh passkey." }, { status: 400 });
  }

  const info = verification.registrationInfo;
  await saveCustomerPasskey({
    customerId: session.customerId,
    credentialId: info.credential.id,
    publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
    counter: info.credential.counter,
    transports: body.response.response.transports,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    name: body.name?.trim().slice(0, 80) || getSessionDevice(request).deviceLabel,
  });
  await recordSecurityEvent(
    "passkey_registered",
    buildRiskContext(request, {
      sessionId: session.sessionId,
      customerId: session.customerId,
    }),
  ).catch(() => undefined);

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearPasskeyChallengeCookie());
  return response;
}
