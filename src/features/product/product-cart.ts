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
}

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

export function validateProductCustomization(
  product: Product,
  customization: ProductCustomization,
): ProductCustomizationErrors {
  const selectedCombination = product.variantCombinations?.find(
    (item) =>
      item.sizeOptionId === customization.selectedSize &&
      item.flavorOptionId === customization.selectedFlavor,
  );
  const combinationUnavailable =
    selectedCombination &&
    (selectedCombination.isAvailable === false ||
      (typeof selectedCombination.stock === "number" &&
        selectedCombination.stock <= 0));

  return {
    selectedSize:
      product.sizeOptions?.length && !customization.selectedSize
        ? "Vui lòng chọn kích thước"
        : undefined,
    selectedFlavor:
      product.flavorOptions?.length && !customization.selectedFlavor
        ? "Vui lòng chọn hương vị"
        : combinationUnavailable
          ? "Tổ hợp này hiện chưa thể bán"
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
