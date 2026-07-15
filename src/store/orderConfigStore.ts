import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeJsonStorage } from "@/lib/storage/safe-json-storage";
import { DeliveryMode, OrderConfig, OrderTiming } from "@/types";

interface OrderConfigState {
  config: OrderConfig;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setOrderTiming: (timing: OrderTiming) => void;
  setDeliveryAddress: (address: OrderConfig["deliveryAddress"]) => void;
}

export const useOrderConfigStore = create<OrderConfigState>()(
  persist(
    (set, get) => ({
      config: {
        deliveryMode: "delivery",
        orderTiming: {
          type: "now",
        },
        deliveryAddress: undefined,
      },

      setDeliveryMode: (mode: DeliveryMode) => {
        // Store previous state for rollback
        const previousState = get();

        try {
          set((state) => ({
            config: {
              ...state.config,
              deliveryMode: mode,
            },
          }));
        } catch (error) {
          console.error("Failed to set delivery mode:", error);
          // Rollback on failure
          set({
            config: previousState.config,
          });
          throw error;
        }
      },

      setOrderTiming: (timing: OrderTiming) => {
        // Store previous state for rollback
        const previousState = get();

        try {
          set((state) => ({
            config: {
              ...state.config,
              orderTiming: timing,
            },
          }));
        } catch (error) {
          console.error("Failed to set order timing:", error);
          // Rollback on failure
          set({
            config: previousState.config,
          });
          throw error;
        }
      },

      setDeliveryAddress: (address: OrderConfig["deliveryAddress"]) => {
        // Store previous state for rollback
        const previousState = get();

        try {
          set((state) => ({
            config: {
              ...state.config,
              deliveryAddress: address,
            },
          }));
        } catch (error) {
          console.error("Failed to set delivery address:", error);
          // Rollback on failure
          set({
            config: previousState.config,
          });
          throw error;
        }
      },
    }),
    {
      name: "bakery-order-config-storage",
      version: 1,
      storage: createSafeJsonStorage<OrderConfigState>("order config"),
    },
  ),
);
