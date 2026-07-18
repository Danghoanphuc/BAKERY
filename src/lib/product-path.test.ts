import { describe, expect, it } from "vitest";

import { getProductIdFromPathSegment, getProductPath } from "./product-path";

describe("product paths", () => {
  it("builds a readable URL while preserving the canonical product id", () => {
    const path = getProductPath({ id: "abc 123", name: "Bánh Red Velvet Cao Cấp" });

    expect(path).toBe("/san-pham/banh-red-velvet-cao-cap--abc%20123");
    expect(getProductIdFromPathSegment(path.split("/").pop()!)).toBe("abc 123");
  });

  it("still accepts legacy id-only route segments", () => {
    expect(getProductIdFromPathSegment("legacy-product-id")).toBe("legacy-product-id");
  });
});
