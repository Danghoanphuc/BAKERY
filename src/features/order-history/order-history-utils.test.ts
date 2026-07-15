import { describe, expect, it } from "vitest";

import type { Order, Product } from "@/types";
import { mapOrderToHistoryItem } from "./order-history-utils";

const sizeId = "f5224d74-4de7-4568-a819-db57c1b21d1a";
const flavorId = "1e2dfba0-f4af-4be4-b835-b75214efb146";

function createOrder(): Order {
  return {
    id: "order-1",
    orderNumber: "DH001",
    customerName: "An",
    customerPhone: "0901234567",
    items: [
      {
        cartItemId: "item-1",
        productId: "cake-1",
        productName: "Bánh kem",
        quantity: 1,
        price: 200_000,
        imageUrl: "/cake.jpg",
        selectedSize: sizeId,
        selectedFlavor: flavorId,
      },
    ],
    totalAmount: 200_000,
    orderType: "pickup",
    status: "pending",
    createdAt: new Date("2026-07-15T00:00:00Z"),
    updatedAt: new Date("2026-07-15T00:00:00Z"),
  };
}

const product: Product = {
  id: "cake-1",
  name: "Bánh kem",
  price: 200_000,
  imageUrl: "/cake.jpg",
  sizeOptions: [{ id: sizeId, label: "16 cm", priceAdjustment: 0 }],
  flavorOptions: [{ id: flavorId, label: "Chocolate" }],
};

describe("order history option labels", () => {
  it("resolves legacy option UUIDs to customer-facing labels", () => {
    const item = mapOrderToHistoryItem(createOrder(), [product]).items[0];

    expect(item.selectedSizeLabel).toBe("16 cm");
    expect(item.selectedFlavorLabel).toBe("Chocolate");
  });

  it("preserves labels captured at checkout", () => {
    const order = createOrder();
    order.items[0].selectedSizeLabel = "Size đặc biệt";
    order.items[0].selectedFlavorLabel = "Vani cũ";

    const item = mapOrderToHistoryItem(order, [product]).items[0];

    expect(item.selectedSizeLabel).toBe("Size đặc biệt");
    expect(item.selectedFlavorLabel).toBe("Vani cũ");
  });
});
