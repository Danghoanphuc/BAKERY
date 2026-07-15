import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkPinRateLimit: vi.fn(),
  clearPinFailures: vi.fn(),
  recordPinFailure: vi.fn(),
  verifyCustomerPin: vi.fn(),
  createCustomerSessionCookie: vi.fn(),
  consumeSecurityAction: vi.fn(),
  recordSecurityEvent: vi.fn(),
  listCustomerPasskeys: vi.fn(),
}));

vi.mock("@/lib/auth/pin-rate-limit", () => ({
  checkPinRateLimit: mocks.checkPinRateLimit,
  clearPinFailures: mocks.clearPinFailures,
  recordPinFailure: mocks.recordPinFailure,
  createPinRateLimitResponse: (status: { retryAfterSeconds: number }) =>
    new Response("limited", {
      status: 429,
      headers: { "Retry-After": String(status.retryAfterSeconds) },
    }),
}));
vi.mock("@/lib/firebase/customer-auth", () => ({
  verifyCustomerPin: mocks.verifyCustomerPin,
}));
vi.mock("@/lib/firebase/customer-passkeys", () => ({
  listCustomerPasskeys: mocks.listCustomerPasskeys,
}));
vi.mock("@/lib/auth/customer-session", () => ({
  createCustomerSessionCookie: mocks.createCustomerSessionCookie,
  readCookie: vi.fn(() => null),
}));
vi.mock("@/lib/security/risk-context", () => ({
  buildRiskContext: vi.fn(() => ({
    network: "network-hash",
    channel: "Browser",
  })),
}));
vi.mock("@/lib/security/security-events", () => ({
  consumeSecurityAction: mocks.consumeSecurityAction,
  recordSecurityEvent: mocks.recordSecurityEvent,
  createSecurityLimitResponse: () => new Response("limited", { status: 429 }),
}));
vi.mock("@/lib/security/adaptive-challenge", () => ({
  passAdaptiveChallenge: vi.fn(() => false),
  createChallengeRequiredResponse: () =>
    new Response("challenge", { status: 403 }),
}));

import { POST } from "./route";

function loginRequest() {
  return new Request("https://bakery.example/api/auth/password-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "203.0.113.5",
    },
    body: JSON.stringify({ phone: "0901234567", pin: "1234" }),
  });
}

describe("PIN login rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkPinRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.clearPinFailures.mockResolvedValue(undefined);
    mocks.recordPinFailure.mockResolvedValue(undefined);
    mocks.consumeSecurityAction.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.recordSecurityEvent.mockResolvedValue(undefined);
    mocks.listCustomerPasskeys.mockResolvedValue([]);
  });

  it("blocks verification while the bucket is locked", async () => {
    mocks.checkPinRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 600,
    });

    const response = await POST(loginRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    expect(mocks.verifyCustomerPin).not.toHaveBeenCalled();
  });

  it("records failed PINs", async () => {
    mocks.verifyCustomerPin.mockResolvedValue(null);

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    expect(mocks.recordPinFailure).toHaveBeenCalledWith(
      expect.any(Request),
      "0901234567",
      "pin-login",
    );
  });

  it("creates an opaque session after successful verification", async () => {
    mocks.verifyCustomerPin.mockResolvedValue({
      id: "customer-1",
      phone: "0901234567",
    });
    mocks.createCustomerSessionCookie.mockResolvedValue(
      "bakery_customer_session=random; HttpOnly",
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(mocks.clearPinFailures).toHaveBeenCalled();
    expect(mocks.createCustomerSessionCookie).toHaveBeenCalledWith(
      "customer-1",
      expect.any(Request),
      { authLevel: "pin" },
    );
  });
});
