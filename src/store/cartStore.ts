import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalQuantity: number;
  totalPrice: number;
}

// Custom storage with error handling for localStorage quota exceeded
const createSafeStorage = () => {
  return createJSONStorage<CartState>(() => ({
    getItem: (name: string) => {
      try {
        const str = localStorage.getItem(name);
        return str ? JSON.parse(str) : null;
      } catch (error) {
        console.error("Failed to retrieve cart from localStorage:", error);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        // Handle quota exceeded error
        if (
          error instanceof DOMException &&
          (error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          console.error(
            "localStorage quota exceeded. Cart changes will not be persisted.",
          );
          // Optionally notify user through a toast or notification system
          // For now, we log the error and continue with in-memory state
        } else {
          console.error("Failed to save cart to localStorage:", error);
        }
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error("Failed to remove cart from localStorage:", error);
      }
    },
  }));
};

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

      addItem: (product: Product) => {
        // Store previous state for rollback
        const previousState = get();

        try {
          // Optimistic update
          set((state) => {
            const existingItem = state.items.find(
              (item) => item.productId === product.id,
            );

            let newItems: CartItem[];
            if (existingItem) {
              newItems = state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              );
            } else {
              newItems = [
                ...state.items,
                {
                  productId: product.id,
                  quantity: 1,
                  price: product.price,
                  product,
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
          // Rollback on failure
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      removeItem: (productId: string) => {
        // Store previous state for rollback
        const previousState = get();

        try {
          // Optimistic update
          set((state) => {
            const newItems = state.items.filter(
              (item) => item.productId !== productId,
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
          // Rollback on failure
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity < 1) return;

        // Store previous state for rollback
        const previousState = get();

        try {
          // Optimistic update
          set((state) => {
            const newItems = state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
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
          // Rollback on failure
          set({
            items: previousState.items,
            totalQuantity: previousState.totalQuantity,
            totalPrice: previousState.totalPrice,
          });
          throw error;
        }
      },

      clearCart: () => {
        // Store previous state for rollback
        const previousState = get();

        try {
          set({
            items: [],
            totalQuantity: 0,
            totalPrice: 0,
          });
        } catch (error) {
          console.error("Failed to clear cart:", error);
          // Rollback on failure
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
      version: 1,
      storage: createSafeStorage(),
    },
  ),
);
