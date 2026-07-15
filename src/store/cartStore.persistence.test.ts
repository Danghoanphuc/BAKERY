import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "./cartStore";

describe("cart persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCartStore.setState({
      items: [],
      totalQuantity: 0,
      totalPrice: 0,
    });
  });

  it("restores an added product after a full-page-style rehydration", async () => {
    useCartStore.getState().addItem({
      productId: "cake-1",
      productName: "Bánh kem",
      quantity: 2,
      price: 120_000,
      imageUrl: "/cake.jpg",
    });

    const persistedCart = window.localStorage.getItem("bakery-cart-storage");
    expect(persistedCart).toContain("cake-1");

    useCartStore.setState({
      items: [],
      totalQuantity: 0,
      totalPrice: 0,
    });
    window.localStorage.setItem("bakery-cart-storage", persistedCart!);
    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState()).toMatchObject({
      totalQuantity: 2,
      totalPrice: 240_000,
      items: [
        expect.objectContaining({
          productId: "cake-1",
          productName: "Bánh kem",
          quantity: 2,
        }),
      ],
    });
  });
});
