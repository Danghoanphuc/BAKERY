import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createStoredCustomerSession: vi.fn(),
  getStoredCustomerSession: vi.fn(),
  revokeStoredCustomerSession: vi.fn(),
  touchStoredCustomerSession: vi.fn(),
}));

vi.mock("@/lib/firebase/customer-sessions", () => mocks);
vi.mock("./session-device", () => ({
  getSessionDevice: () => ({
    deviceLabel: "Messenger · Android",
    userAgent: "Messenger",
    ipHash: "private-ip-hash",
  }),
}));

import {
  createCustomerSessionCookie,
  hashCustomerSessionToken,
  hasRecentStrongAuthentication,
  parseCustomerSessionValue,
  revokeCustomerSessionValue,
} from "./customer-session";

describe("opaque customer sessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores only a hash while sending the random token in the cookie", async () => {
    const cookie = await createCustomerSessionCookie("customer-1");
    const token = cookie.match(/bakery_customer_session=([^;]+)/)?.[1] || "";
    const [storedId, storedSession] = mocks.createStoredCustomerSession.mock
      .calls[0];

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(storedId).toBe(hashCustomerSessionToken(token));
    expect(storedId).not.toBe(token);
    expect(storedSession).toMatchObject({
      customerId: "customer-1",
      deviceLabel: "Messenger · Android",
      ipHash: "private-ip-hash",
      authLevel: "guest",
    });
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("accepts only an active, unexpired database session", async () => {
    mocks.getStoredCustomerSession.mockResolvedValue({
      id: "hash",
      customerId: "customer-1",
      deviceLabel: "Zalo · Android",
      userAgent: "Zalo",
      createdAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      authLevel: "pin",
      strongAuthenticatedAt: new Date(),
    });

    const session = await parseCustomerSessionValue("a".repeat(43));

    expect(session?.customerId).toBe("customer-1");
    expect(session?.sessionId).toHaveLength(64);
    expect(session && hasRecentStrongAuthentication(session)).toBe(true);
  });

  it("does not treat guest sessions as recent strong authentication", () => {
    expect(
      hasRecentStrongAuthentication({
        customerId: "customer-1",
        sessionId: "hash",
        expiresAt: new Date(Date.now() + 60_000),
        authLevel: "guest",
      }),
    ).toBe(false);
  });

  it("rejects revoked sessions and revokes logout tokens by hash", async () => {
    mocks.getStoredCustomerSession.mockResolvedValue({
      id: "hash",
      customerId: "customer-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    });

    expect(await parseCustomerSessionValue("b".repeat(43))).toBeNull();

    mocks.getStoredCustomerSession.mockResolvedValue({
      id: "hash",
      customerId: "customer-1",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    });
    await revokeCustomerSessionValue("c".repeat(43));
    expect(mocks.revokeStoredCustomerSession).toHaveBeenCalledWith(
      hashCustomerSessionToken("c".repeat(43)),
    );
  });
});
