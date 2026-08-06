import { describe, expect, it } from "vitest";
import { canAdminAccessPath, getAdminHomeForRole, getAdminPermissionForPath, hasAdminPermission } from "./admin-rbac";

describe("admin RBAC", () => {
  it("maps admin and API paths to the same permission", () => {
    expect(getAdminPermissionForPath("/admin/marketing/brand")).toBe("marketing");
    expect(getAdminPermissionForPath("/api/admin/loyalty")).toBe("marketing");
    expect(getAdminPermissionForPath("/api/admin/finance/budgets")).toBe("finance");
    expect(getAdminPermissionForPath("/api/pos/checkout")).toBe("pos");
    expect(getAdminPermissionForPath("/wholesale/finance")).toBe("finance");
    expect(getAdminPermissionForPath("/api/wholesale/orders")).toBe("orders");
    expect(getAdminPermissionForPath("/wholesale/production-plan")).toBe("inventory");
    expect(getAdminPermissionForPath("/api/wholesale/production-plan/groups")).toBe("inventory");
  });

  it("keeps sensitive areas isolated by role", () => {
    expect(canAdminAccessPath("marketing", "/admin/marketing/brand")).toBe(true);
    expect(canAdminAccessPath("marketing", "/admin/finance")).toBe(false);
    expect(canAdminAccessPath("finance", "/api/admin/finance/budgets")).toBe(true);
    expect(canAdminAccessPath("cashier", "/admin/security")).toBe(false);
    expect(canAdminAccessPath("sales", "/wholesale/routes/today")).toBe(true);
    expect(canAdminAccessPath("sales", "/api/wholesale/field-routes")).toBe(true);
    expect(canAdminAccessPath("sales", "/wholesale/customers")).toBe(false);
    expect(canAdminAccessPath("manager", "/wholesale/routes")).toBe(true);
    expect(canAdminAccessPath("manager", "/api/wholesale/field-routes")).toBe(true);
    expect(canAdminAccessPath("warehouse", "/wholesale/production-plan")).toBe(true);
    expect(canAdminAccessPath("cashier", "/wholesale/production-plan")).toBe(false);
    expect(hasAdminPermission("owner", "security")).toBe(true);
  });

  it("chooses a useful landing page for specialist roles", () => {
    expect(getAdminHomeForRole("marketing")).toBe("/admin/marketing");
    expect(getAdminHomeForRole("cashier")).toBe("/admin/pos");
    expect(getAdminHomeForRole("sales")).toBe("/admin/routes/today");
  });
});
