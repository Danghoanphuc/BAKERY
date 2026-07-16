import { expect, test } from "@playwright/test";

test("paid order detail visual baseline", async ({ page }) => {
  await page.route("**/api/orders/order-visual", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: "order-visual",
      orderNumber: "ST-20260717-001",
      items: [
        { cartItemId: "cake-1", productId: "cake-1", productName: "Bánh kem dâu SweetTime", quantity: 1, price: 420000, imageUrl: "", selectedSizeLabel: "18 cm", selectedFlavorLabel: "Vani dâu" },
        { cartItemId: "tea-1", productId: "tea-1", productName: "Trà Earl Grey", quantity: 2, price: 55000, imageUrl: "" },
      ],
      totalAmount: 550000,
      productSubtotal: 530000,
      deliveryFee: 20000,
      discountAmount: 0,
      orderType: "delivery",
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "bank_transfer",
      deliveryAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM",
      loyaltyPointsEarned: 55,
      createdAt: "2026-07-17T01:00:00.000Z",
    }),
  }));
  await page.goto("/order/order-visual");
  await expect(page.getByRole("heading", { name: "#ST-20260717-001" })).toBeVisible();
  await expect(page).toHaveScreenshot("paid-order-detail.png");
});

test("paid bank transfer redirects to the order detail", async ({ page }) => {
  await page.route("**/api/orders/order-visual/payment-status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "order-visual", orderNumber: "ST-20260717-001", status: "confirmed", totalAmount: 550000, paymentStatus: "paid", paymentMethod: "bank_transfer" }),
  }));
  await page.route("**/api/orders/order-visual", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "order-visual", orderNumber: "ST-20260717-001", items: [], totalAmount: 550000, orderType: "delivery", status: "confirmed", paymentStatus: "paid", createdAt: "2026-07-17T01:00:00.000Z" }),
  }));
  await page.goto("/checkout/payment?orderId=order-visual&orderNumber=ST-20260717-001");
  await page.waitForURL("**/order/order-visual", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "#ST-20260717-001" })).toBeVisible();
});
