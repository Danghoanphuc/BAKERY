import { afterEach, describe, expect, it } from "vitest";

import { buildRiskContext } from "./risk-context";
import { createVisitorToken, hashVisitorToken } from "./visitor";

describe("risk context", () => {
  afterEach(() => {
    delete process.env.AUTH_HASH_SECRET;
  });

  it("keeps private identifiers pseudonymous", () => {
    process.env.AUTH_HASH_SECRET = "test-secret-at-least-thirty-two-characters";
    const visitor = createVisitorToken();
    const request = new Request("https://bakery.example/checkout", {
      headers: {
        cookie: `bakery_visitor=${visitor}`,
        "x-forwarded-for": "203.0.113.25",
        "user-agent": "Mozilla/5.0 Zalo Android",
      },
    });
    const context = buildRiskContext(request, {
      customerId: "customer-1",
      phone: "0901234567",
      address: "12 Đường Hoa, Quận 1",
    });

    expect(context.visitor).toBe(hashVisitorToken(visitor));
    expect(context.phone).not.toContain("0901234567");
    expect(context.address).not.toContain("duonghoa");
    expect(context.customer).not.toContain("customer-1");
    expect(context.channel).toBe("Zalo");
  });

  it("groups IPv4 addresses by privacy-preserving /24 network", () => {
    process.env.AUTH_HASH_SECRET = "test-secret-at-least-thirty-two-characters";
    const makeRequest = (ip: string) =>
      new Request("https://bakery.example", {
        headers: { "x-forwarded-for": ip },
      });

    expect(buildRiskContext(makeRequest("203.0.113.5")).network).toBe(
      buildRiskContext(makeRequest("203.0.113.200")).network,
    );
    expect(buildRiskContext(makeRequest("203.0.114.5")).network).not.toBe(
      buildRiskContext(makeRequest("203.0.113.5")).network,
    );
  });
});

