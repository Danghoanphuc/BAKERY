import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SelectedVoucher } from "@/types/voucher";

interface VoucherState {
  selectedVoucher?: SelectedVoucher;
  setSelectedVoucher: (voucher: SelectedVoucher) => void;
  clearSelectedVoucher: () => void;
}

export const useVoucherStore = create<VoucherState>()(
  persist(
    (set) => ({
      selectedVoucher: undefined,
      setSelectedVoucher: (voucher) => set({ selectedVoucher: voucher }),
      clearSelectedVoucher: () => set({ selectedVoucher: undefined }),
    }),
    {
      name: "bakery-voucher-storage",
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return localStorage;
      }),
    },
  ),
);
