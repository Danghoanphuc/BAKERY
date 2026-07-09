import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, generateCartItemId } from "@/types";

type PosCartState = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
};

function computeTotals(items: CartItem[]) {
  return {
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    ),
  };
}

const storage = createJSONStorage<PosCartState>(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }

  return localStorage;
});

export const usePosCartStore = create<PosCartState>()(
  persist(
    (set) => ({
      items: [],
      totalQuantity: 0,
      totalPrice: 0,

      addItem: (itemData) =>
        set((state) => {
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
          const items = existingItem
            ? state.items.map((item) =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + itemData.quantity }
                  : item,
              )
            : [...state.items, { ...itemData, cartItemId }];

          return { items, ...computeTotals(items) };
        }),

      removeItem: (cartItemId) =>
        set((state) => {
          const items = state.items.filter(
            (item) => item.cartItemId !== cartItemId,
          );
          return { items, ...computeTotals(items) };
        }),

      updateQuantity: (cartItemId, quantity) => {
        if (quantity < 1) return;
        set((state) => {
          const items = state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item,
          );
          return { items, ...computeTotals(items) };
        });
      },

      clearCart: () => set({ items: [], totalQuantity: 0, totalPrice: 0 }),

      setItems: (items) => set({ items, ...computeTotals(items) }),
    }),
    {
      name: "bakery-pos-cart-storage",
      version: 1,
      storage,
    },
  ),
);
