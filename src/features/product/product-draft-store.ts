import { create } from "zustand";

import type { ProductCustomization } from "@/features/product/product-cart";

type ProductDraftState = {
  drafts: Record<string, ProductCustomization>;
  setDraft: (productId: string, customization: ProductCustomization) => void;
};

export const useProductDraftStore = create<ProductDraftState>((set) => ({
  drafts: {},
  setDraft: (productId, customization) =>
    set((state) => ({
      drafts: { ...state.drafts, [productId]: customization },
    })),
}));
