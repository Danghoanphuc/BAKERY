import { describe, expect, it } from "vitest";
import {
  getProductItemValidationError,
  getSemiFinishedActivationError,
  normalizeProductItemInput,
  prepareProductItemForCreate,
} from "./product-item-payload";

describe("product item payload", () => {
  it("keeps ingredient procurement fields and removes selling capabilities", () => {
    const result = normalizeProductItemInput({
      itemType: "ingredient",
      name: "Bột mì số 13",
      ingredientGroup: "Bột mì",
      ingredientGroupId: "flour-starch",
      ingredientSubgroupId: "wheat-flour",
      baseUnit: "gram",
      purchaseUnit: "túi",
      purchasePackQuantity: 1000,
      referencePurchasePrice: 32_000,
      imageUrl: "https://example.com/flour.jpg",
      price: 99_000,
      isAvailable: true,
      sizeOptions: [{ id: "large", label: "L", priceAdjustment: 0 }],
    });

    expect(result.itemType).toBe("ingredient");
    if (result.itemType !== "ingredient") {
      throw new Error("Expected ingredient payload");
    }
    expect(result.isAvailable).toBe(false);
    expect(result.price).toBe(0);
    expect(result.imageUrl).toBe("https://example.com/flour.jpg");
    expect(result.sizeOptions).toEqual([]);
    expect(result.ingredientGroupId).toBe("flour-starch");
    expect(result.ingredientSubgroupId).toBe("wheat-flour");
    expect(getProductItemValidationError(result)).toBeNull();
  });

  it("keeps semi-finished production fields and prevents publishing", () => {
    const result = normalizeProductItemInput({
      itemType: "semi_finished",
      name: "Cốt bánh chocolate",
      manufacturingOutputQuantity: 8,
      manufacturingOutputUnit: "cốt",
      manufacturingLeadMinutes: 45,
      imageUrl: "https://example.com/cake-base.jpg",
      isAvailable: true,
      price: 120_000,
    });

    expect(result.itemType).toBe("semi_finished");
    if (result.itemType !== "semi_finished") {
      throw new Error("Expected semi-finished payload");
    }
    expect(result.manufacturingOutputQuantity).toBe(8);
    expect(result.isAvailable).toBe(false);
    expect(result.price).toBe(0);
    expect(result.imageUrl).toBe("https://example.com/cake-base.jpg");
    expect(getProductItemValidationError(result)).toBeNull();
  });

  it("creates semi-finished records as zero-stock drafts with a canonical inventory unit", () => {
    const result = prepareProductItemForCreate({
      itemType: "semi_finished",
      name: "Cốt bánh vanilla",
      lifecycleStatus: "active",
      stock: 25,
      baseUnit: "gram",
      manufacturingOutputQuantity: 2000,
    });

    expect(result.itemType).toBe("semi_finished");
    if (result.itemType !== "semi_finished") {
      throw new Error("Expected semi-finished payload");
    }
    expect(result.lifecycleStatus).toBe("draft");
    expect(result.stock).toBe(0);
    expect(result.baseUnit).toBe("gram");
    expect(result.manufacturingOutputUnit).toBe("g");
  });

  it("requires an active BOM before activating a semi-finished record", () => {
    const result = normalizeProductItemInput({
      itemType: "semi_finished",
      name: "Kem bơ",
      lifecycleStatus: "active",
      baseUnit: "gram",
      manufacturingOutputQuantity: 1000,
    });

    expect(getSemiFinishedActivationError(result, false)).toContain(
      "BOM đang hoạt động",
    );
    expect(getSemiFinishedActivationError(result, true)).toBeNull();
  });

  it("requires storefront data only for finished products", () => {
    const result = normalizeProductItemInput({
      itemType: "finished_good",
      name: "Bánh kem",
      displayName: "Bánh kem",
      price: 250_000,
    });

    expect(getProductItemValidationError(result)).toBe(
      "Vui lòng chọn danh mục bán hàng.",
    );
  });
});
