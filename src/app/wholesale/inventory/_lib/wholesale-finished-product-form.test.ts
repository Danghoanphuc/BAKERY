import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
  applyExistingProductToWholesaleForm,
  createEmptyWholesaleFinishedProductForm,
  getWholesaleFinishedProductFormError,
  wholesaleFinishedProductFormToPayload,
} from "./wholesale-finished-product-form";

describe("wholesale finished product form", () => {
  it("builds a wholesale offer without retail storefront fields", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductForm(),
      name: "Bánh mì bơ tỏi",
      sellUnitLabel: "Thùng 24",
      unitsPerSellUnit: 24,
      wholesalePrice: 480_000,
      minimumOrderQuantity: 2,
      orderIncrement: 1,
      deliveryAreas: "Quận 1, Quận 3",
      isAvailable: true,
    };

    expect(getWholesaleFinishedProductFormError(form)).toBeNull();
    expect(wholesaleFinishedProductFormToPayload(form)).toMatchObject({
      product: {
        name: "Bánh mì bơ tỏi",
      },
      offer: {
        sellUnitLabel: "Thùng 24",
        unitsPerSellUnit: 24,
        wholesalePrice: 480_000,
        deliveryAreas: ["Quận 1", "Quận 3"],
      },
    });
  });

  it("requires MOQ to follow the order increment", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductForm(),
      name: "Croissant",
      sellUnitLabel: "Khay 6",
      minimumOrderQuantity: 3,
      orderIncrement: 2,
    };
    expect(getWholesaleFinishedProductFormError(form)).toContain("bội số");
  });

  it("copies identity from an existing finished product", () => {
    const product = {
      id: "product-1",
      name: "Tiramisu",
      price: 0,
      imageUrl: "/tiramisu.jpg",
      itemType: "finished_good",
      sku: "TP-TIRAMISU-01",
      baseUnit: "each",
    } satisfies Product;
    const result = applyExistingProductToWholesaleForm(
      { ...createEmptyWholesaleFinishedProductForm(), source: "existing" },
      product,
    );
    expect(result).toMatchObject({
      productId: "product-1",
      name: "Tiramisu",
      sku: "TP-TIRAMISU-01",
      baseUnit: "each",
    });
  });
});
