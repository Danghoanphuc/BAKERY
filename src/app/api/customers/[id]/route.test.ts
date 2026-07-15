import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  parseSession: vi.fn(),
  updateCustomer: vi.fn(),
  getCustomerById: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/auth/customer-session", () => ({
  CUSTOMER_SESSION_COOKIE: "session",
  readCookie: vi.fn(() => "token"),
  parseCustomerSessionValue: mocks.parseSession,
}));
vi.mock("@/lib/firebase", () => ({
  updateCustomer: mocks.updateCustomer,
  getCustomerById: mocks.getCustomerById,
  deleteCustomer: mocks.deleteCustomer,
}));

import { DELETE, GET, PUT } from "./route";

const context = { params: Promise.resolve({ id: "customer-1" }) };

describe("customer API authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks public reads and deletes", async () => {
    mocks.requireAdmin.mockReturnValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
    expect((await GET(new Request("http://local/api/customers/customer-1"), context)).status).toBe(401);
    expect((await DELETE(new Request("http://local/api/customers/customer-1", { method: "DELETE" }), context)).status).toBe(401);
    expect(mocks.getCustomerById).not.toHaveBeenCalled();
    expect(mocks.deleteCustomer).not.toHaveBeenCalled();
  });

  it("whitelists fields when a customer updates their own account", async () => {
    mocks.requireAdmin.mockReturnValue(new Response(null, { status: 401 }));
    mocks.parseSession.mockResolvedValue({ customerId: "customer-1" });
    const request = new Request("http://local/api/customers/customer-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "An", loyaltyPoints: 999999, tier: "vip", personalization: { marketingConsent: true } }),
    });
    expect((await PUT(request, context)).status).toBe(200);
    expect(mocks.updateCustomer).toHaveBeenCalledWith(
      "customer-1",
      expect.not.objectContaining({ loyaltyPoints: expect.anything(), tier: expect.anything() }),
    );
    expect(mocks.updateCustomer.mock.calls[0][1].personalization.marketingConsent).toBe(true);
  });
});
