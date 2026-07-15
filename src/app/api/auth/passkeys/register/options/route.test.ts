import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseCustomerSessionValue: vi.fn(),
  hasRecentStrongAuthentication: vi.fn(),
  getCustomerById: vi.fn(),
  listCustomerPasskeys: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  createPasskeyChallenge: vi.fn(),
}));

vi.mock("@/lib/auth/customer-session", () => ({
  CUSTOMER_SESSION_COOKIE: "bakery_customer_session",
  readCookie: () => "opaque-token",
  parseCustomerSessionValue: mocks.parseCustomerSessionValue,
  hasRecentStrongAuthentication: mocks.hasRecentStrongAuthentication,
}));
vi.mock("@/lib/firebase/customers", () => ({
  getCustomerById: mocks.getCustomerById,
}));
vi.mock("@/lib/firebase/customer-passkeys", () => ({
  listCustomerPasskeys: mocks.listCustomerPasskeys,
  createPasskeyChallenge: mocks.createPasskeyChallenge,
}));
vi.mock("@/lib/auth/passkey", () => ({
  getPasskeyConfig: () => ({
    origin: "https://bakery.example",
    rpId: "bakery.example",
    rpName: "Bakery",
  }),
  createPasskeyChallengeCookie: (id: string) =>
    `bakery_passkey_challenge=${id}; HttpOnly`,
}));
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mocks.generateRegistrationOptions,
}));

import { POST } from "./route";

const request = () =>
  new Request("https://bakery.example/api/auth/passkeys/register/options", {
    method: "POST",
    headers: { cookie: "bakery_customer_session=opaque-token" },
  });

describe("passkey registration authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseCustomerSessionValue.mockResolvedValue({
      customerId: "customer-1",
      sessionId: "session-1",
      authLevel: "guest",
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it("rejects a guest session", async () => {
    mocks.hasRecentStrongAuthentication.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.generateRegistrationOptions).not.toHaveBeenCalled();
  });

  it("allows a recently PIN-authenticated session", async () => {
    mocks.hasRecentStrongAuthentication.mockReturnValue(true);
    mocks.getCustomerById.mockResolvedValue({
      id: "customer-1",
      phone: "0901234567",
      name: "Khách",
    });
    mocks.listCustomerPasskeys.mockResolvedValue([]);
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "challenge" });
    mocks.createPasskeyChallenge.mockResolvedValue("challenge-id");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
