import { expect, test } from "@playwright/test";

const adminPassword = process.env.ADMIN_PASSWORD || "admin";

test.beforeEach(async ({ page }) => {
  const login = await page.request.post("/api/admin/auth/login", { data: { password: adminPassword } });
  expect(login.ok()).toBe(true);
});

test("brand guidelines visual baseline", async ({ page }) => {
  await page.goto("/admin/marketing/brand");
  await expect(page.getByRole("heading", { name: "SweetTime", exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("admin-brand.png");
});

test("loyalty header visual baseline", async ({ page }) => {
  await page.route("**/api/admin/loyalty*", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      settings: { pointsPerAmount: 10000, tiers: [] },
      rules: [], rewards: [], segments: [], versions: [], audit: [], ledger: [],
      stats: { members: 128, activeMembers: 84, outstandingPoints: 12400, estimatedLiability: 620000, completedOrders: 240, memberRevenue: 42000000, tierDistribution: [] },
    }),
  }));
  await page.goto("/admin/marketing/loyalty");
  await expect(page.getByRole("heading", { name: "Chương trình khách hàng thân thiết" })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveScreenshot("admin-loyalty.png");
});
