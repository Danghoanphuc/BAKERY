import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getCustomerByPhone: vi.fn(),
  listCustomerPasskeys: vi.fn(),
  consumeSecurityAction: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  getCustomerByPhone: mocks.getCustomerByPhone,
}));
vi.mock("@/lib/firebase/customer-passkeys", () => ({
  listCustomerPasskeys: mocks.listCustomerPasskeys,
}));
vi.mock("@/lib/security/risk-context", () => ({
  buildRiskContext: () => ({ network: "network", channel: "Browser" }),
}));
vi.mock("@/lib/security/security-events", () => ({
  consumeSecurityAction: mocks.consumeSecurityAction,
  createSecurityLimitResponse: () => new Response("limited", { status: 429 }),
}));

function createRequest(phone: string) {
  return new Request("http://localhost/api/auth/checkout-recognition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
}

describe("checkout phone recognition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCustomerPasskeys.mockResolvedValue([]);
    mocks.consumeSecurityAction.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("asks for verification without exposing customer data", async () => {
    mocks.getCustomerByPhone.mockResolvedValue({
      id: "0901234567",
      name: "Khách cũ",
      hasPassword: true,
    });

    const response = await POST(createRequest("090 123 4567"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      verificationRequired: true,
      passkeyAvailable: false,
    });
    expect(payload).not.toHaveProperty("customer");
    expect(mocks.getCustomerByPhone).toHaveBeenCalledWith("0901234567");
  });

  it("lets a new phone continue as guest", async () => {
    mocks.getCustomerByPhone.mockResolvedValue(null);

    const response = await POST(createRequest("0912345678"));

    expect(await response.json()).toEqual({
      ok: true,
      verificationRequired: false,
      passkeyAvailable: false,
    });
  });

  it("rejects an invalid phone before querying customer data", async () => {
    const response = await POST(createRequest("0123"));

    expect(response.status).toBe(400);
    expect(mocks.getCustomerByPhone).not.toHaveBeenCalled();
  });
});
