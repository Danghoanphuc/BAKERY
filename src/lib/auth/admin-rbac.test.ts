import { describe, expect, it } from "vitest";
import { canAdminAccessPath, getAdminHomeForRole, getAdminPermissionForPath, hasAdminPermission } from "./admin-rbac";

describe("admin RBAC", () => {
  it("maps admin and API paths to the same permission", () => {
    expect(getAdminPermissionForPath("/admin/marketing/brand")).toBe("marketing");
    expect(getAdminPermissionForPath("/api/admin/loyalty")).toBe("marketing");
    expect(getAdminPermissionForPath("/api/admin/finance/budgets")).toBe("finance");
    expect(getAdminPermissionForPath("/api/pos/checkout")).toBe("pos");
  });

  it("keeps sensitive areas isolated by role", () => {
    expect(canAdminAccessPath("marketing", "/admin/marketing/brand")).toBe(true);
    expect(canAdminAccessPath("marketing", "/admin/finance")).toBe(false);
    expect(canAdminAccessPath("finance", "/api/admin/finance/budgets")).toBe(true);
    expect(canAdminAccessPath("cashier", "/admin/security")).toBe(false);
    expect(hasAdminPermission("owner", "security")).toBe(true);
  });

  it("chooses a useful landing page for specialist roles", () => {
    expect(getAdminHomeForRole("marketing")).toBe("/admin/marketing");
    expect(getAdminHomeForRole("cashier")).toBe("/admin/pos");
  });
});
