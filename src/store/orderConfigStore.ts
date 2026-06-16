import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DeliveryMode, OrderConfig, OrderTiming } from "@/types";

interface OrderConfigState {
  config: OrderConfig;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setOrderTiming: (timing: OrderTiming) => void;
  setDeliveryAddress: (address: OrderConfig["deliveryAddress"]) => void;
}

// Custom storage with error handling for localStorage quota exceeded
const createSafeStorage = () => {
  return createJSONStorage<OrderConfigState>(() => ({
    getItem: (name: string) => {
      try {
        const str = localStorage.getItem(name);
        return str ? JSON.parse(str) : null;
      } catch (error) {
        console.error(
          "Failed to retrieve order config from localStorage:",
          error,
        );
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
            "localStorage quota exceeded. Order config changes will not be persisted.",
          );
          // Optionally notify user through a toast or notification system
          // For now, we log the error and continue with in-memory state
        } else {
          console.error("Failed to save order config to localStorage:", error);
        }
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error(
          "Failed to remove order config from localStorage:",
          error,
        );
      }
    },
  }));
};

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
      storage: createSafeStorage(),
    },
  ),
);
