import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import { buildHomeRecommendations } from "./home-recommendations";

const products: Product[] = [
  product("coffee", "Cà phê sữa", { tags: ["cà phê"], isFeatured: true }),
  product("bread", "Bánh mì bơ", { tags: ["bánh mì"] }),
  product("cake", "Bánh kem dâu", { isBestseller: true }),
  product("tea", "Trà đào", { tags: ["trà"] }),
];

describe("buildHomeRecommendations", () => {
  it("prioritizes products that fit the current time slot", () => {
    const [timely] = buildHomeRecommendations({
      products,
      hour: 8,
      limitPerGroup: 2,
    });

    expect(timely.key).toBe("timely");
    expect(timely.products.map((item) => item.id)).toEqual([
      "coffee",
      "bread",
    ]);
  });

  it("uses completed purchase history and avoids duplicates between groups", () => {
    const groups = buildHomeRecommendations({
      products,
      hour: 14,
      limitPerGroup: 1,
      orders: [
        {
          status: "completed",
          items: [{ productId: "cake", quantity: 2 }],
        },
      ],
    });
    const repurchase = groups.find((group) => group.key === "repurchase");
    const ids = groups.flatMap((group) => group.products.map((item) => item.id));

    expect(repurchase?.products[0]?.id).toBe("cake");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not show repurchase recommendations without eligible orders", () => {
    const groups = buildHomeRecommendations({
      products,
      orders: [{ status: "cancelled", items: [{ productId: "cake", quantity: 3 }] }],
      limitPerGroup: 1,
    });

    expect(groups.some((group) => group.key === "repurchase")).toBe(false);
  });
});

function product(
  id: string,
  name: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    name,
    price: 50_000,
    imageUrl: "/product.jpg",
    ...overrides,
  };
}
