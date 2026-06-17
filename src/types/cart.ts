export interface CartItem {
  cartItemId: string; // Unique ID: productId + customization hash
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Final price including size adjustment
  imageUrl: string;
  // Customization fields
  selectedSize?: string; // Size option ID
  selectedFlavor?: string; // Flavor option ID
  customMessage?: string; // Message on cake
  candles?: number; // Number of candles
}

/**
 * Generate unique cart item ID based on product and customizations
 * Same product with different customizations = different cart items
 */
export function generateCartItemId(
  productId: string,
  selectedSize?: string,
  selectedFlavor?: string,
  customMessage?: string,
  candles?: number,
): string {
  const parts = [
    productId,
    selectedSize || "default",
    selectedFlavor || "default",
    customMessage || "",
    candles?.toString() || "0",
  ];
  return parts.join("|");
}
