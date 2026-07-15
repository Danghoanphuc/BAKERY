import {
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
} from "zustand/middleware";

function isQuotaExceededError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/**
 * Creates a Zustand JSON storage adapter while keeping serialization in
 * createJSONStorage. StateStorage must return the original JSON string;
 * parsing it here would make Zustand parse the value a second time.
 */
export function createSafeJsonStorage<T>(label: string): PersistStorage<T> {
  const stateStorage: StateStorage = {
    getItem: (name) => {
      if (typeof window === "undefined") return null;

      try {
        return window.localStorage.getItem(name);
      } catch (error) {
        console.error(`Failed to retrieve ${label} from localStorage:`, error);
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;

      try {
        window.localStorage.setItem(name, value);
      } catch (error) {
        if (isQuotaExceededError(error)) {
          console.error(
            `localStorage quota exceeded. ${label} changes will not be persisted.`,
          );
          return;
        }

        console.error(`Failed to save ${label} to localStorage:`, error);
      }
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;

      try {
        window.localStorage.removeItem(name);
      } catch (error) {
        console.error(`Failed to remove ${label} from localStorage:`, error);
      }
    },
  };

  const storage = createJSONStorage<T>(() => stateStorage);
  if (!storage) {
    throw new Error(`Unable to initialize ${label} storage`);
  }

  return storage;
}
