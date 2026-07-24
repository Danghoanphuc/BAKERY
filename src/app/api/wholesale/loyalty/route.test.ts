import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), getMarketingSettings: vi.fn(), getAllCustomers: vi.fn(), getAllOrders: vi.fn(),
  getWorkspace: vi.fn(), updateSettings: vi.fn(), saveEntity: vi.fn(), createVersion: vi.fn(), activateVersion: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/wholesale-firebase", () => ({ getMarketingSettings: mocks.getMarketingSettings, getAllCustomers: mocks.getAllCustomers, getAllOrders: mocks.getAllOrders, updateMarketingSettings: mocks.updateSettings }));
vi.mock("@/lib/wholesale-firebase/loyalty", () => ({ getLoyaltyWorkspaceData: mocks.getWorkspace, saveLoyaltyEntity: mocks.saveEntity, createLoyaltyVersion: mocks.createVersion, activateLoyaltyVersion: mocks.activateVersion }));
import { GET, POST } from "./route";

describe("admin loyalty API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("requires an admin session", async () => {
    mocks.requireAdmin.mockReturnValue(new Response(null, { status: 401 }));
    expect((await GET(new Request("http://local/api/wholesale/loyalty"))).status).toBe(401);
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
  it("routes entity saves through the loyalty repository", async () => {
    mocks.requireAdmin.mockReturnValue(null);
    mocks.saveEntity.mockResolvedValue({ id: "rule-1", name: "Double points" });
    const response = await POST(new Request("http://local/api/wholesale/loyalty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_entity", kind: "rule", value: { name: "Double points" } }) }));
    expect(response.status).toBe(200);
    expect(mocks.saveEntity).toHaveBeenCalledWith("rule", { name: "Double points" });
  });
});
