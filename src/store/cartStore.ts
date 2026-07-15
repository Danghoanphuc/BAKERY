import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeJsonStorage } from "@/lib/storage/safe-json-storage";
import { CartItem, generateCartItemId } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  totalQuantity: number;
  totalPrice: number;
}

// Helper function to compute totals
const computeTotals = (items: CartItem[]) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return { totalQuantity, totalPrice };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalQuantity: 0,
      totalPrice: 0,

      addItem: (itemData: Omit<CartItem, "cartItemId">) => {
        const previousState = get();

        try {
          set((state) => {
            // Generate unique cart item ID
            const cartItemId = generateCartItemId(
              itemData.productId,
              itemData.selectedSize,
              itemData.selectedFlavor,
              itemData.customMessage,
              itemData.candles,
            );

            const existingItem = state.items.find(
              (item) => item.cartItemId === cartItemId,
            );

            let newItems: CartItem[];
            if (existingItem) {
              // Same product with same customizations - just increase quantity
              newItems = state.items.map((item) =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + itemData.quantity }
                  : item,
              );
            } else {
              // New cart item (different product or different customizations)
              newItems = [
                ...state.items,
                {
                  ...itemData,
                  cartItemId,
                },
              ];
            }

            const { totalQuantity, totalPrice } = computeTotals(newItems);
            return {
              items: newItems,
              totalQuantity,
              totalPrice,
            };
          });
        } catch (error) {
          console.error("Failed to add item to cart:", error);
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      removeItem: (cartItemId: string) => {
        const previousState = get();

        try {
          set((state) => {
            const newItems = state.items.filter(
              (item) => item.cartItemId !== cartItemId,
            );
            const { totalQuantity, totalPrice } = computeTotals(newItems);
            return {
              items: newItems,
              totalQuantity,
              totalPrice,
            };
          });
        } catch (error) {
          console.error("Failed to remove item from cart:", error);
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      updateQuantity: (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;

        const previousState = get();

        try {
          set((state) => {
            const newItems = state.items.map((item) =>
              item.cartItemId === cartItemId ? { ...item, quantity } : item,
            );
            const { totalQuantity, totalPrice } = computeTotals(newItems);
            return {
              items: newItems,
              totalQuantity,
              totalPrice,
            };
          });
        } catch (error) {
          console.error("Failed to update quantity:", error);
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      clearCart: () => {
        const previousState = get();

        try {
          set({
            items: [],
            totalQuantity: 0,
            totalPrice: 0,
          });
        } catch (error) {
          console.error("Failed to clear cart:", error);
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      setItems: (items: CartItem[]) => {
        const previousState = get();

        try {
          const { totalQuantity, totalPrice } = computeTotals(items);
          set({
            items,
            totalQuantity,
            totalPrice,
          });
        } catch (error) {
          console.error("Failed to set items:", error);
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },
    }),
    {
      name: "bakery-cart-storage",
      version: 2, // Increment version due to breaking changes
      storage: createSafeJsonStorage<CartState>("cart"),
    },
  ),
);
