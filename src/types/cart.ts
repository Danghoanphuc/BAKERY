export interface CartItem {
  cartItemId: string; // Unique ID: productId + customization hash
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Final price including size adjustment
  imageUrl: string;
  // Customization fields
  selectedSize?: string; // Size option ID
  selectedSizeLabel?: string; // Human-readable size name
  selectedSizeSku?: string; // SKU from size option (for barcode matching)
  selectedFlavor?: string; // Flavor option ID
  selectedFlavorLabel?: string; // Human-readable flavor name
  selectedFlavorSku?: string; // SKU from flavor option (for barcode matching)
  customMessage?: string; // Message on cake
  candles?: number; // Number of candles
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCartItemSizeLabel(item: CartItem) {
  return item.selectedSizeLabel ||
    (item.selectedSize && !UUID_PATTERN.test(item.selectedSize)
      ? item.selectedSize
      : undefined);
}

export function getCartItemFlavorLabel(item: CartItem) {
  return item.selectedFlavorLabel ||
    (item.selectedFlavor && !UUID_PATTERN.test(item.selectedFlavor)
      ? item.selectedFlavor
      : undefined);
}

export function getCartItemVariantDetails(item: CartItem) {
  const size = getCartItemSizeLabel(item);
  const flavor = getCartItemFlavorLabel(item);
  return [size && `Size: ${size}`, flavor && `Vị: ${flavor}`].filter(Boolean);
}

/**
 * Generate unique cart item ID based on product and customizations
 * Same product with different customizations = different cart items
 * If SKU is available (from barcode scan), use it for exact matching
 */
export function generateCartItemId(
  productId: string,
  selectedSize?: string,
  selectedFlavor?: string,
  customMessage?: string,
  candles?: number,
  sizeSku?: string,
  flavorSku?: string,
): string {
  const parts = [
    productId,
    sizeSku || selectedSize || "default",
    flavorSku || selectedFlavor || "default",
    customMessage || "",
    candles?.toString() || "0",
  ];
  return parts.join("|");
}
