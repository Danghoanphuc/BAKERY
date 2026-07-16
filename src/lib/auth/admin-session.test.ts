import { afterEach, describe, expect, it } from "vitest";
import { createAdminSessionCookie, createAdminSessionValue, parseAdminSessionValue, verifyAdminCredentials } from "./admin-session";
import { requireAdmin } from "./require-admin";

const previousAccounts = process.env.ADMIN_ACCOUNTS_JSON;
const previousSecret = process.env.ADMIN_SESSION_SECRET;

afterEach(() => {
  if (previousAccounts === undefined) delete process.env.ADMIN_ACCOUNTS_JSON;
  else process.env.ADMIN_ACCOUNTS_JSON = previousAccounts;
  if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = previousSecret;
});

describe("admin session roles", () => {
  it("authenticates configured role accounts and preserves role in the session", () => {
    process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-at-least-32-characters";
    process.env.ADMIN_ACCOUNTS_JSON = JSON.stringify([{ id: "mkt", name: "Marketing", role: "marketing", password: "mkt-pass" }]);
    const principal = verifyAdminCredentials("mkt-pass");
    expect(principal).toEqual({ id: "mkt", name: "Marketing", role: "marketing" });
    expect(parseAdminSessionValue(createAdminSessionValue(principal!))?.role).toBe("marketing");
  });

  it("returns 403 when a valid role calls a forbidden API", () => {
    process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-at-least-32-characters";
    const cookie = createAdminSessionCookie({ id: "mkt", name: "Marketing", role: "marketing" }).split(";")[0];
    const denied = requireAdmin(new Request("http://localhost/api/admin/finance/budgets", { headers: { cookie } }));
    expect(denied?.status).toBe(403);
    expect(requireAdmin(new Request("http://localhost/api/admin/loyalty", { headers: { cookie } }))).toBeNull();
  });
});
