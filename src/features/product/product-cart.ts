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

export function getProductUnitPrice(
  product: Product,
  selectedSize?: string,
): number {
  const sizeAdjustment = product.sizeOptions?.find(
    (option) => option.id === selectedSize,
  )?.priceAdjustment;

  return product.price + (sizeAdjustment ?? 0);
}

export function getProductTotal(
  product: Product,
  customization: Pick<ProductCustomization, "quantity" | "selectedSize">,
): number {
  return getProductUnitPrice(product, customization.selectedSize) * customization.quantity;
}

export function validateProductCustomization(
  product: Product,
  customization: ProductCustomization,
): ProductCustomizationErrors {
  return {
    selectedSize:
      product.sizeOptions?.length && !customization.selectedSize
        ? "Vui lòng chọn kích thước"
        : undefined,
    selectedFlavor:
      product.flavorOptions?.length && !customization.selectedFlavor
        ? "Vui lòng chọn hương vị"
        : undefined,
  };
}

export function buildProductCartItem(
  product: Product,
  customization: ProductCustomization,
): Omit<CartItem, "cartItemId"> {
  const selectedSizeOption = product.sizeOptions?.find(
    (option) => option.id === customization.selectedSize,
  );
  const selectedFlavorOption = product.flavorOptions?.find(
    (option) => option.id === customization.selectedFlavor,
  );

  return {
    productId: product.id,
    productName: product.name,
    quantity: customization.quantity,
    price: getProductUnitPrice(product, customization.selectedSize),
    imageUrl: product.imageUrl,
    selectedSize: customization.selectedSize,
    selectedSizeLabel: selectedSizeOption?.label,
    selectedFlavor: customization.selectedFlavor,
    selectedFlavorLabel: selectedFlavorOption?.label,
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
