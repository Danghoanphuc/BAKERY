import { expect, test } from "@playwright/test";

test("marketing role cannot enter finance or see restricted navigation", async ({ page }) => {
  const login = await page.request.post("/api/admin/auth/login", { data: { password: "visual-marketing-password" } });
  expect(login.ok()).toBe(true);
  await page.goto("/admin/finance");
  await page.waitForURL("**/admin/marketing");
  await expect(page.getByRole("link", { name: /tài chính/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /an toàn/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /marketing/i })).toBeVisible();
});
