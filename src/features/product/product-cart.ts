import type { CartItem, Product } from "@/types";

export interface ProductCustomization {
  quantity: number;
  selectedSize?: string;
  selectedFlavor?: string;
  customMessage?: string;
  candles?: number;
}

export interface ProductCustomizationErrors {
  selectedSize?: string;
  selectedFlavor?: string;
  quantity?: string;
}

export type ProductPriceRange = {
  min: number;
  max: number;
};

/** Resolves the data that identifies one selected variant everywhere it is sold. */
export function getProductVariantSelection(
  product: Product,
  selectedSize?: string,
  selectedFlavor?: string,
) {
  const size = product.sizeOptions?.find((option) => option.id === selectedSize);
  const flavor = product.flavorOptions?.find(
    (option) => option.id === selectedFlavor,
  );
  const combination = product.variantCombinations?.find(
    (item) =>
      item.sizeOptionId === selectedSize &&
      item.flavorOptionId === selectedFlavor,
  );

  return {
    size,
    flavor,
    combination,
    imageUrl: flavor?.imageUrl || size?.imageUrl || product.imageUrl,
  };
}

export function getProductUnitPrice(
  product: Product,
  selectedSize?: string,
  selectedFlavor?: string,
): number {
  const { combination, size, flavor } = getProductVariantSelection(
    product,
    selectedSize,
    selectedFlavor,
  );
  const combinationAdjustment = combination?.priceAdjustment;
  if (typeof combinationAdjustment === "number") {
    return product.price + combinationAdjustment;
  }
  const sizeAdjustment = size?.priceAdjustment;
  const flavorAdjustment = flavor?.priceAdjustment;
  return product.price + (sizeAdjustment ?? 0) + (flavorAdjustment ?? 0);
}

export function getProductTotal(
  product: Product,
  customization: Pick<ProductCustomization, "quantity" | "selectedSize" | "selectedFlavor">,
): number {
  return getProductUnitPrice(product, customization.selectedSize, customization.selectedFlavor) * customization.quantity;
}

export function getProductPriceRange(product: Product): ProductPriceRange {
  const sizes = product.sizeOptions?.length
    ? product.sizeOptions
    : [{ id: undefined, priceAdjustment: 0 }];
  const flavors = product.flavorOptions?.length
    ? product.flavorOptions
    : [{ id: undefined, priceAdjustment: 0 }];
  const prices: number[] = [];

  for (const size of sizes) {
    for (const flavor of flavors) {
      if (isProductSelectionAvailable(product, size.id, flavor.id, 1)) {
        prices.push(getProductUnitPrice(product, size.id, flavor.id));
      }
    }
  }

  if (prices.length === 0) return { min: product.price, max: product.price };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getProductStartingPrice(product: Product) {
  return getProductPriceRange(product).min;
}

export function getProductSelectionMaxQuantity(
  product: Product,
  selectedSize?: string,
  selectedFlavor?: string,
) {
  const { size, flavor, combination } = getProductVariantSelection(
    product,
    selectedSize,
    selectedFlavor,
  );
  const stocks = [product.stock, size?.stock, flavor?.stock, combination?.stock]
    .filter((stock): stock is number => typeof stock === "number")
    .map((stock) => Math.max(0, stock));

  return stocks.length ? Math.min(99, ...stocks) : 99;
}

export function isProductSelectionAvailable(
  product: Product,
  selectedSize?: string,
  selectedFlavor?: string,
  quantity = 1,
) {
  const { combination } = getProductVariantSelection(
    product,
    selectedSize,
    selectedFlavor,
  );
  const needsCompleteCombination = Boolean(
    product.variantCombinations?.length &&
      product.sizeOptions?.length &&
      product.flavorOptions?.length,
  );

  if (needsCompleteCombination && selectedSize && selectedFlavor && !combination) {
    return false;
  }
  if (combination?.isAvailable === false) return false;
  return getProductSelectionMaxQuantity(product, selectedSize, selectedFlavor) >= quantity;
}

export function isProductOptionAvailable(
  product: Product,
  option: { sizeId?: string; flavorId?: string },
  current: Pick<ProductCustomization, "selectedSize" | "selectedFlavor" | "quantity">,
) {
  const selectedSize = option.sizeId ?? current.selectedSize;
  const selectedFlavor = option.flavorId ?? current.selectedFlavor;
  const hasBothAxes = Boolean(product.sizeOptions?.length && product.flavorOptions?.length);

  if (product.variantCombinations?.length && hasBothAxes) {
    return product.variantCombinations.some(
      (combination) =>
        (!selectedSize || combination.sizeOptionId === selectedSize) &&
        (!selectedFlavor || combination.flavorOptionId === selectedFlavor) &&
        combination.isAvailable !== false &&
        (combination.stock === undefined || combination.stock >= current.quantity),
    );
  }

  return isProductSelectionAvailable(
    product,
    selectedSize,
    selectedFlavor,
    current.quantity,
  );
}

export function validateProductCustomization(
  product: Product,
  customization: ProductCustomization,
): ProductCustomizationErrors {
  const selectionUnavailable = Boolean(
    customization.selectedSize || customization.selectedFlavor,
  ) && !isProductSelectionAvailable(
    product,
    customization.selectedSize,
    customization.selectedFlavor,
    customization.quantity,
  );
  const maxQuantity = getProductSelectionMaxQuantity(
    product,
    customization.selectedSize,
    customization.selectedFlavor,
  );

  return {
    selectedSize:
      product.sizeOptions?.length && !customization.selectedSize
        ? "Vui lòng chọn kích thước"
        : undefined,
    selectedFlavor:
      product.flavorOptions?.length && !customization.selectedFlavor
        ? "Vui lòng chọn hương vị"
        : selectionUnavailable
          ? "Tổ hợp này hiện chưa thể bán"
        : undefined,
    quantity:
      maxQuantity < customization.quantity
        ? "Số lượng vẫn có không đủ"
        : undefined,
  };
}

export function buildProductCartItem(
  product: Product,
  customization: ProductCustomization,
): Omit<CartItem, "cartItemId"> {
  const { size, flavor, imageUrl } = getProductVariantSelection(
    product,
    customization.selectedSize,
    customization.selectedFlavor,
  );

  return {
    productId: product.id,
    productName: product.name,
    quantity: customization.quantity,
    price: getProductUnitPrice(product, customization.selectedSize, customization.selectedFlavor),
    imageUrl,
    selectedSize: customization.selectedSize,
    selectedSizeLabel: size?.label,
    selectedSizeSku: size?.sku,
    selectedFlavor: customization.selectedFlavor,
    selectedFlavorLabel: flavor?.label,
    selectedFlavorSku: flavor?.sku,
    customMessage: customization.customMessage?.trim() || undefined,
    candles: customization.candles || undefined,
  };
}

export function hasProductOptions(product: Product): boolean {
  return Boolean(
    product.sizeOptions?.length ||
      product.flavorOptions?.length ||
      product.requiresMessage,
  );
}

export function canQuickAddProduct(
  product: Product,
  deliveryMode: "delivery" | "pickup",
): boolean {
  const supportsMode =
    deliveryMode === "pickup"
      ? product.availableForPickup !== false
      : product.availableForDelivery !== false;

  return Boolean(
    !hasProductOptions(product) &&
      supportsMode &&
      product.isAvailable !== false &&
      product.availableToday !== false &&
      !product.requiresPreorder &&
      (product.stock === undefined || product.stock > 0),
  );
}
