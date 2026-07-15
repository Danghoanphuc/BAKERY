import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { validatePin } from "@/lib/auth/password";
import {
  checkPinRateLimit,
  clearPinFailures,
  createPinRateLimitResponse,
  recordPinFailure,
} from "@/lib/auth/pin-rate-limit";
import { verifyCustomerPin } from "@/lib/firebase/customer-auth";
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
  recordSecurityEvent,
} from "@/lib/security/security-events";
import {
  createChallengeRequiredResponse,
  passAdaptiveChallenge,
} from "@/lib/security/adaptive-challenge";

export async function POST(request: Request) {
  try {
    const { phone, pin, password, securityChallengeToken } = await request.json();
    const normalizedPhone =
      typeof phone === "string" ? normalizePhoneInput(phone) : "";
    const submittedPin =
      typeof pin === "string"
        ? pin
        : typeof password === "string"
          ? password
          : "";

    if (!normalizedPhone || !submittedPin) {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại và mã PIN." },
        { status: 400 },
      );
    }

    const phoneError = getVietnamPhoneValidationError(normalizedPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const pinError = validatePin(submittedPin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 });
    }

    const riskContext = buildRiskContext(request, { phone: normalizedPhone });
    const securityLimit = await consumeSecurityAction(
      "pin_attempt",
      riskContext,
      [
        { subject: "visitor", max: 15, windowMs: 15 * 60_000 },
        { subject: "network", max: 30, windowMs: 15 * 60_000 },
      ],
    );
    if (!securityLimit.allowed) {
      const passed = await passAdaptiveChallenge(
        request,
        riskContext,
        securityChallengeToken,
        "pin_login",
      );
      if (!passed) {
        return securityChallengeToken
          ? createSecurityLimitResponse(securityLimit)
          : createChallengeRequiredResponse("pin_login");
      }
    }

    const rateLimit = await checkPinRateLimit(
      request,
      normalizedPhone,
      "pin-login",
    );
    if (!rateLimit.allowed) return createPinRateLimitResponse(rateLimit);

    const customer = await verifyCustomerPin(normalizedPhone, submittedPin);

    if (!customer) {
      await recordPinFailure(request, normalizedPhone, "pin-login");
      await recordSecurityEvent("pin_failed", riskContext).catch((error) =>
        console.error("Failed to record PIN failure:", error),
      );
      return NextResponse.json(
        { error: "Số điện thoại hoặc mã PIN không đúng." },
        { status: 401 },
      );
    }

    await recordSecurityEvent("login_succeeded", riskContext).catch((error) =>
      console.error("Failed to record login:", error),
    );

    await clearPinFailures(request, normalizedPhone, "pin-login").catch(
      (error) => console.error("Failed to clear PIN login failures:", error),
    );

    const response = NextResponse.json({ ok: true, customer });
    response.headers.append(
      "Set-Cookie",
      await createCustomerSessionCookie(customer.id, request),
    );
    return response;
  } catch (error) {
    console.error("PIN login failed:", error);
    return NextResponse.json(
      { error: "Không thể đăng nhập. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
