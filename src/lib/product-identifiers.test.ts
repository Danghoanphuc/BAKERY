import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
  createInternalBarcode,
  createNextProductSku,
  createProductSku,
  createProductSkuPattern,
  createVariantSku,
  ensureProductIdentifiers,
  getIdentifierValidationError,
} from "./product-identifiers";

describe("product identifiers", () => {
  it("creates a valid internal EAN-13 barcode", () => {
    const barcode = createInternalBarcode();
    const digits = barcode.split("").map(Number);
    const sum = digits.slice(0, 12).reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
      0,
    );

    expect(barcode).toMatch(/^20\d{11}$/);
    expect(digits[12]).toBe((10 - (sum % 10)) % 10);
  });

  it("uses a readable item-type prefix for generated SKU", () => {
    expect(createProductSku({ itemType: "finished_good", name: "Bánh mì bơ tỏi" }))
      .toBe("TP-BOTOI-01");
    expect(createProductSku({ itemType: "finished_good", name: "Bánh đậu đỏ" }))
      .toBe("TP-DAUDO-01");
  });

  it("previews identifiers with the same SKU naming rule", () => {
    expect(createProductSkuPattern({ itemType: "ingredient", name: "Bột mì số 8" }))
      .toBe("NL-BOTMI8-XX");
  });

  it("allocates the next sequence within the same product code", () => {
    expect(createNextProductSku(
      [{ sku: "TP-BOTOI-01" }, { sku: "TP-BOTOI-03" }, { sku: "TP-KEM-09" }],
      { itemType: "finished_good", name: "Bánh mì bơ tỏi" },
    )).toBe("TP-BOTOI-04");
  });

  it("rejects a variant identifier already used by another product", () => {
    const error = getIdentifierValidationError(
      [{
        id: "existing",
        variantCombinations: [{
          id: "v1",
          sizeOptionId: "s",
          flavorOptionId: "f",
          barcode: "2001234567893",
        }],
      }],
      {
        id: "candidate",
        variantCombinations: [{
          id: "v2",
          sizeOptionId: "s",
          flavorOptionId: "f",
          barcode: "2001234567893",
        }],
      },
    );

    expect(error).toContain("đã được dùng");
  });

  it("keeps the unique product token in generated variant SKUs", () => {
    const first = createVariantSku({
      productSku: "TP-BANH-MI-BO-A2K8",
      sizeLabel: "20cm",
      flavorLabel: "Socola",
    });
    const second = createVariantSku({
      productSku: "TP-BANH-MI-BO-Z9X7",
      sizeLabel: "20cm",
      flavorLabel: "Socola",
    });

    expect(first).not.toBe(second);
    expect(first).toContain("A2K8");
    expect(first.length).toBeLessThanOrEqual(24);
  });

  it("creates a short readable variant SKU", () => {
    expect(createVariantSku({
      productSku: "TP-GEN-BOTOI-01",
      sizeLabel: "",
      flavorLabel: "Phô mai",
    })).toBe("BOTOI-01-PM");
  });

  it("rejects duplicate identifiers on independent size/flavor options", () => {
    const error = getIdentifierValidationError(
      [{
        id: "existing",
        sizeOptions: [{ id: "s1", label: "20cm", priceAdjustment: 0, sku: "DUP-01" }],
      }],
      {
        id: "candidate",
        flavorOptions: [{ id: "f1", label: "Socola", sku: "DUP-01" }],
      },
    );

    expect(error).toContain("đã được dùng");
  });

  it("uses one namespace for SKU and barcode values", () => {
    const error = getIdentifierValidationError(
      [{ id: "existing", sku: "2001234567893" }],
      { id: "candidate", barcode: "2001234567893" },
    );

    expect(error).toContain("đã được dùng");
  });

  it("fills and normalizes missing identifiers before persistence", () => {
    const product = ensureProductIdentifiers({
      name: "Bánh kem",
      itemType: "finished_good",
      sku: "",
      barcode: "",
      sizeOptions: [{ id: "s1", label: "20cm", priceAdjustment: 0 }],
    } as Partial<Product>);

    expect(product.sku).toBe("TP-KEM-01");
    expect(product.barcode).toMatch(/^20\d{11}$/);
    const productSequence = (product.sku ?? "").split("-").slice(-1)[0];
    expect(product.sizeOptions?.[0].sku).toContain(productSequence);
    expect(product.sizeOptions?.[0].sku?.length).toBeLessThanOrEqual(24);
    expect(product.sizeOptions?.[0].barcode).toMatch(/^20\d{11}$/);
  });
});
