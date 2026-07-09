import type { CartItem } from "@/types";
import type { PaymentMethod } from "@/types/finance";
import type { SelectedVoucher } from "@/types/voucher";

export type PosDisplayStatus =
  | "idle"
  | "editing"
  | "awaiting_payment"
  | "paid"
  | "thank_you";

export type PosDisplaySnapshot = {
  status: PosDisplayStatus;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  voucher?: SelectedVoucher;
  paymentMethod?: PaymentMethod;
  orderNumber?: string;
  loyaltyPointsEarned?: number;
  updatedAt: string;
};

const CHANNEL_NAME = "bakery-pos-display";
const STORAGE_KEY = "bakery-pos-display-snapshot";

export const emptyPosDisplaySnapshot: PosDisplaySnapshot = {
  status: "idle",
  items: [],
  subtotal: 0,
  discountAmount: 0,
  totalAmount: 0,
  updatedAt: new Date(0).toISOString(),
};

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function readPosDisplaySnapshot() {
  if (!canUseBrowserStorage()) return emptyPosDisplaySnapshot;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? ({ ...emptyPosDisplaySnapshot, ...JSON.parse(stored) } as PosDisplaySnapshot)
      : emptyPosDisplaySnapshot;
  } catch (error) {
    console.error("Failed to read POS customer display snapshot:", error);
    return emptyPosDisplaySnapshot;
  }
}

export function publishPosDisplaySnapshot(
  snapshot: Omit<PosDisplaySnapshot, "updatedAt">,
) {
  if (!canUseBrowserStorage()) return;

  const nextSnapshot: PosDisplaySnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot));
    window.dispatchEvent(
      new CustomEvent<PosDisplaySnapshot>("bakery-pos-display-local", {
        detail: nextSnapshot,
      }),
    );

    const channel = getChannel();
    channel?.postMessage(nextSnapshot);
    channel?.close();
  } catch (error) {
    console.error("Failed to publish POS customer display snapshot:", error);
  }
}

export function subscribePosDisplaySnapshot(
  onSnapshot: (snapshot: PosDisplaySnapshot) => void,
) {
  if (!canUseBrowserStorage()) return () => undefined;

  onSnapshot(readPosDisplaySnapshot());

  const channel = getChannel();
  const handleMessage = (event: MessageEvent<PosDisplaySnapshot>) => {
    onSnapshot({ ...emptyPosDisplaySnapshot, ...event.data });
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    onSnapshot({
      ...emptyPosDisplaySnapshot,
      ...(JSON.parse(event.newValue) as PosDisplaySnapshot),
    });
  };
  const handleLocal = (event: Event) => {
    onSnapshot(
      (event as CustomEvent<PosDisplaySnapshot>).detail ??
        readPosDisplaySnapshot(),
    );
  };

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("bakery-pos-display-local", handleLocal);

  return () => {
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("bakery-pos-display-local", handleLocal);
  };
}
