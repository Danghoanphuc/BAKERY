import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  isPayOSEnabled: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/payos", () => ({
  isPayOSEnabled: mocks.isPayOSEnabled,
}));

import { GET } from "./route";

describe("POS config API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose POS configuration without an admin session", async () => {
    mocks.requireAdmin.mockReturnValue(new Response(null, { status: 401 }));

    const response = await GET(new Request("http://local/api/pos/config"));

    expect(response.status).toBe(401);
    expect(mocks.isPayOSEnabled).not.toHaveBeenCalled();
  });

  it("returns the PayOS capability to authenticated admins", async () => {
    mocks.requireAdmin.mockReturnValue(null);
    mocks.isPayOSEnabled.mockReturnValue(true);

    const response = await GET(new Request("http://local/api/pos/config"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ payosEnabled: true });
  });
});
