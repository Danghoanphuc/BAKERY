import { describe, expect, it } from "vitest";

import type { Product } from "@/types";
import {
  buildProductCartItem,
  canQuickAddProduct,
  getProductTotal,
  getProductUnitPrice,
  hasProductOptions,
  validateProductCustomization,
} from "./product-cart";

const product: Product = {
  id: "cake-1",
  name: "Bánh sinh nhật",
  price: 300_000,
  imageUrl: "/cake.jpg",
  sizeOptions: [
    { id: "small", label: "16cm", priceAdjustment: 0 },
    {
      id: "large",
      label: "20cm",
      priceAdjustment: 100_000,
      imageUrl: "/large.jpg",
      sku: "CAKE-20CM",
    },
  ],
  flavorOptions: [
    { id: "vanilla", label: "Vanilla", imageUrl: "/vanilla.jpg", sku: "VANILLA" },
  ],
};

describe("product cart helpers", () => {
  it("uses option ids when calculating price", () => {
    expect(getProductUnitPrice(product, "large")).toBe(400_000);
    expect(getProductTotal(product, { quantity: 2, selectedSize: "large" })).toBe(
      800_000,
    );
  });

  it("builds one consistent cart payload", () => {
    expect(
      buildProductCartItem(product, {
        quantity: 2,
        selectedSize: "large",
        selectedFlavor: "vanilla",
        customMessage: "  Chúc mừng  ",
        candles: 0,
      }),
    ).toEqual({
      productId: "cake-1",
      productName: "Bánh sinh nhật",
      quantity: 2,
      price: 400_000,
      imageUrl: "/vanilla.jpg",
      selectedSize: "large",
      selectedSizeLabel: "20cm",
      selectedSizeSku: "CAKE-20CM",
      selectedFlavor: "vanilla",
      selectedFlavorLabel: "Vanilla",
      selectedFlavorSku: "VANILLA",
      customMessage: "Chúc mừng",
      candles: undefined,
    });
  });

  it("requires explicit selections for configurable products", () => {
    expect(validateProductCustomization(product, { quantity: 1 })).toEqual({
      selectedSize: "Vui lòng chọn kích thước",
      selectedFlavor: "Vui lòng chọn hương vị",
    });
    expect(hasProductOptions(product)).toBe(true);
  });

  it("only quick-adds simple products that can be ordered now", () => {
    const simpleProduct: Product = {
      id: "bread-1",
      name: "Bánh mì",
      price: 25_000,
      imageUrl: "/bread.jpg",
      availableForDelivery: true,
      availableToday: true,
    };

    expect(canQuickAddProduct(simpleProduct, "delivery")).toBe(true);
    expect(canQuickAddProduct({ ...simpleProduct, stock: 0 }, "delivery")).toBe(false);
    expect(canQuickAddProduct(product, "delivery")).toBe(false);
  });
});
