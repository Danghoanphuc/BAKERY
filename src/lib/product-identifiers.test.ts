import { describe, expect, it } from "vitest";
import {
  createInternalBarcode,
  createProductSku,
  getIdentifierValidationError,
} from "./product-identifiers";

describe("product identifiers", () => {
  it("creates a valid internal EAN-13 barcode", () => {
    const barcode = createInternalBarcode();
    const digits = barcode.split("").map(Number);
    const sum = digits.slice(0, 12).reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);

    expect(barcode).toMatch(/^20\d{11}$/);
    expect(digits[12]).toBe((10 - (sum % 10)) % 10);
  });

  it("uses a readable item-type prefix for generated SKU", () => {
    expect(createProductSku({ itemType: "finished_good", name: "Bánh mì bơ tỏi" })).toMatch(/^TP-BANH-MI-BO-/);
  });

  it("rejects a variant identifier already used by another product", () => {
    const error = getIdentifierValidationError(
      [{ id: "existing", variantCombinations: [{ id: "v1", sizeOptionId: "s", flavorOptionId: "f", barcode: "2001234567890" }] }],
      { id: "candidate", variantCombinations: [{ id: "v2", sizeOptionId: "s", flavorOptionId: "f", barcode: "2001234567890" }] },
    );

    expect(error).toContain("đã được dùng");
  });
});
