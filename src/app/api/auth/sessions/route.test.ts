import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseCustomerSessionValue: vi.fn(),
  listStoredCustomerSessions: vi.fn(),
  revokeStoredCustomerSession: vi.fn(),
  revokeOtherStoredCustomerSessions: vi.fn(),
}));

vi.mock("@/lib/auth/customer-session", () => ({
  CUSTOMER_SESSION_COOKIE: "bakery_customer_session",
  readCookie: () => "opaque-token",
  parseCustomerSessionValue: mocks.parseCustomerSessionValue,
  createClearCustomerSessionCookie: () =>
    "bakery_customer_session=; Max-Age=0; HttpOnly",
}));
vi.mock("@/lib/firebase/customer-sessions", () => ({
  listStoredCustomerSessions: mocks.listStoredCustomerSessions,
  revokeStoredCustomerSession: mocks.revokeStoredCustomerSession,
  revokeOtherStoredCustomerSessions: mocks.revokeOtherStoredCustomerSessions,
}));

import { DELETE, GET, POST } from "./route";

const currentSessionId = "a".repeat(64);
const otherSessionId = "b".repeat(64);
const current = {
  customerId: "customer-1",
  sessionId: currentSessionId,
  expiresAt: new Date(Date.now() + 60_000),
};
const storedSessions = [
  {
    id: currentSessionId,
    customerId: "customer-1",
    deviceLabel: "Zalo · Android",
    userAgent: "Zalo",
    createdAt: new Date(),
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  },
  {
    id: otherSessionId,
    customerId: "customer-1",
    deviceLabel: "Messenger · Android",
    userAgent: "Messenger",
    createdAt: new Date(),
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  },
];

function request(method = "GET", body?: object) {
  return new Request("https://bakery.example/api/auth/sessions", {
    method,
    headers: {
      Cookie: "bakery_customer_session=opaque-token",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("customer session device management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseCustomerSessionValue.mockResolvedValue(current);
    mocks.listStoredCustomerSessions.mockResolvedValue(storedSessions);
    mocks.revokeStoredCustomerSession.mockResolvedValue(undefined);
    mocks.revokeOtherStoredCustomerSessions.mockResolvedValue(1);
  });

  it("marks the current device without exposing raw tokens", async () => {
    const response = await GET(request());
    const payload = await response.json();

    expect(payload.sessions).toHaveLength(2);
    expect(payload.sessions[0]).not.toHaveProperty("token");
    expect(
      payload.sessions.find((session: { id: string }) =>
        session.id === currentSessionId,
      ).current,
    ).toBe(true);
  });

  it("revokes a customer-owned device session", async () => {
    const response = await DELETE(
      request("DELETE", { sessionId: otherSessionId }),
    );

    expect(response.status).toBe(200);
    expect(mocks.revokeStoredCustomerSession).toHaveBeenCalledWith(
      otherSessionId,
    );
  });

  it("revokes every other device while preserving the current one", async () => {
    const response = await POST(request("POST"));

    expect(response.status).toBe(200);
    expect(mocks.revokeOtherStoredCustomerSessions).toHaveBeenCalledWith(
      "customer-1",
      currentSessionId,
    );
  });
});
