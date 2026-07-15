import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import {
  clearPasskeyChallengeCookie,
  getPasskeyConfig,
  readPasskeyChallenge,
} from "@/lib/auth/passkey";
import {
  consumePasskeyChallenge,
  getPasskeyByCredentialId,
  updatePasskeyUsage,
} from "@/lib/firebase/customer-passkeys";
import { buildRiskContext } from "@/lib/security/risk-context";
import { recordSecurityEvent } from "@/lib/security/security-events";

export async function POST(request: Request) {
  const rawChallengeId = readPasskeyChallenge(request);
  const challenge = rawChallengeId
    ? await consumePasskeyChallenge(rawChallengeId)
    : null;
  if (!challenge || challenge.purpose !== "authentication") {
    return NextResponse.json({ error: "Yêu cầu passkey đã hết hạn." }, { status: 400 });
  }

  const body = (await request.json()) as { response: AuthenticationResponseJSON };
  const passkey = await getPasskeyByCredentialId(body.response.id);
  if (!passkey || passkey.customerId !== challenge.customerId) {
    return NextResponse.json({ error: "Passkey không hợp lệ." }, { status: 401 });
  }

  const config = getPasskeyConfig();
  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
      counter: passkey.counter,
      transports: passkey.transports,
    },
    requireUserVerification: true,
  }).catch(() => null);
  if (!verification?.verified) {
    return NextResponse.json({ error: "Passkey không hợp lệ." }, { status: 401 });
  }

  await updatePasskeyUsage(passkey.id, verification.authenticationInfo.newCounter);
  await recordSecurityEvent(
    "passkey_login_succeeded",
    buildRiskContext(request, { customerId: passkey.customerId }),
  ).catch(() => undefined);

  const response = NextResponse.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    await createCustomerSessionCookie(passkey.customerId, request),
  );
  response.headers.append("Set-Cookie", clearPasskeyChallengeCookie());
  return response;
}
