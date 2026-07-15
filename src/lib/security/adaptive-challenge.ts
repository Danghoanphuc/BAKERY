import { recordSecurityEvent } from "./security-events";
import type { RiskContext } from "./risk-context";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export function isTurnstileEnabled() {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

export async function verifyTurnstileToken(
  request: Request,
  token: unknown,
  expectedAction: string,
) {
  if (!isTurnstileEnabled() || typeof token !== "string" || !token) {
    return false;
  }

  const form = new FormData();
  form.set("secret", process.env.TURNSTILE_SECRET_KEY!);
  form.set("response", token);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.set("remoteip", ip);
  form.set("idempotency_key", crypto.randomUUID());

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResult;
  return result.success === true &&
    (!result.action || result.action === expectedAction);
}

export async function passAdaptiveChallenge(
  request: Request,
  context: RiskContext,
  token: unknown,
  action: string,
) {
  const passed = await verifyTurnstileToken(request, token, action).catch(
    () => false,
  );
  await recordSecurityEvent(
    passed ? "challenge_passed" : "challenge_failed",
    context,
    { provider: "turnstile", action },
  ).catch((error) => console.error("Failed to record challenge:", error));
  return passed;
}

export function createChallengeRequiredResponse(action: string) {
  if (!isTurnstileEnabled()) {
    return new Response(
      JSON.stringify({
        error: "Yêu cầu đang bị giới hạn để bảo vệ tài khoản. Vui lòng thử lại sau.",
        code: "security_rate_limited",
      }),
      { status: 429, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  return new Response(
    JSON.stringify({
      error: "Vui lòng xác minh để tiếp tục.",
      code: "challenge_required",
      challenge: "turnstile",
      action,
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    }),
    { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

