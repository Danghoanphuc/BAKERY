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
  cashReceived?: number;
  changeAmount?: number;
  paymentQrCode?: string;
  paymentCheckoutUrl?: string;
  paymentDeadline?: number;
  orderNumber?: string;
  loyaltyPointsEarned?: number;
  updatedAt: string;
};

export type PosDisplaySessionConfig = {
  sessionId: string;
  displayToken: string;
  expiresAt: string;
};

export type PosDisplayConnectionState =
  | "connecting"
  | "connected"
  | "stale"
  | "disconnected"
  | "invalid";

const CHANNEL_PREFIX = "bakery-pos-display";
const SNAPSHOT_PREFIX = "bakery-pos-display-snapshot";
const SESSION_CONFIG_KEY = "bakery-pos-display-session";
const HEARTBEAT_MS = 5_000;
const POLL_MS = 2_000;
const STALE_AFTER_MS = 12_000;
const SYNC_WARNING_THROTTLE_MS = 30_000;
export const POS_DISPLAY_SESSION_CHANGED_EVENT =
  "bakery-pos-display-session-changed";

let sessionPromise: Promise<PosDisplaySessionConfig> | null = null;
let latestSnapshot: Omit<PosDisplaySnapshot, "updatedAt"> | null = null;
let heartbeatTimer: number | null = null;
let lastSyncWarningAt = 0;

export const emptyPosDisplaySnapshot: PosDisplaySnapshot = {
  status: "idle",
  items: [],
  subtotal: 0,
  discountAmount: 0,
  totalAmount: 0,
  updatedAt: new Date(0).toISOString(),
};

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function snapshotStorageKey(sessionId: string) {
  return `${SNAPSHOT_PREFIX}:${sessionId}`;
}

function channelName(sessionId: string) {
  return `${CHANNEL_PREFIX}:${sessionId}`;
}

function getChannel(sessionId: string) {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(channelName(sessionId));
}

function readSessionConfig() {
  if (!canUseBrowserStorage() || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosDisplaySessionConfig;
    if (
      !parsed.sessionId ||
      !parsed.displayToken ||
      new Date(parsed.expiresAt).getTime() <= Date.now() + 60_000
    ) {
      sessionStorage.removeItem(SESSION_CONFIG_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(SESSION_CONFIG_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return null;
  }
}

function storeSessionConfig(config: PosDisplaySessionConfig) {
  sessionStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(
    new CustomEvent<PosDisplaySessionConfig>(
      POS_DISPLAY_SESSION_CHANGED_EVENT,
      { detail: config },
    ),
  );
}

function clearSessionConfig(expectedSessionId?: string) {
  const current = readSessionConfig();
  if (expectedSessionId && current?.sessionId !== expectedSessionId) return;
  try {
    sessionStorage.removeItem(SESSION_CONFIG_KEY);
  } catch {
    // A new session can still be kept in memory when storage is unavailable.
  }
}

function warnDisplaySync(error: unknown) {
  const now = Date.now();
  if (now - lastSyncWarningAt < SYNC_WARNING_THROTTLE_MS) return;
  lastSyncWarningAt = now;
  console.warn(
    "POS customer display is temporarily unavailable; the sale flow remains active.",
    error,
  );
}

export async function getOrCreatePosDisplaySession() {
  const existing = readSessionConfig();
  if (existing) return existing;
  if (sessionPromise) return sessionPromise;

  sessionPromise = fetch("/api/pos/display/session", {
    method: "POST",
    credentials: "same-origin",
  })
    .then(async (response) => {
      const data = (await response.json()) as
        | PosDisplaySessionConfig
        | { error?: string };
      if (!response.ok || !("sessionId" in data)) {
        throw new Error("error" in data ? data.error : "Không thể tạo phiên màn hình khách.");
      }
      storeSessionConfig(data);
      return data;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
}

export function getPosDisplayUrl(config: PosDisplaySessionConfig) {
  const params = new URLSearchParams({
    session: config.sessionId,
    token: config.displayToken,
  });
  return `/pos/customer-display?${params.toString()}`;
}

export function readPosDisplaySnapshot(sessionId: string) {
  if (!canUseBrowserStorage() || typeof localStorage === "undefined") {
    return emptyPosDisplaySnapshot;
  }
  try {
    const stored = localStorage.getItem(snapshotStorageKey(sessionId));
    return stored
      ? ({ ...emptyPosDisplaySnapshot, ...JSON.parse(stored) } as PosDisplaySnapshot)
      : emptyPosDisplaySnapshot;
  } catch (error) {
    console.error("Failed to read POS customer display snapshot:", error);
    return emptyPosDisplaySnapshot;
  }
}

function publishLocalSnapshot(sessionId: string, snapshot: PosDisplaySnapshot) {
  try {
    localStorage.setItem(snapshotStorageKey(sessionId), JSON.stringify(snapshot));
    window.dispatchEvent(
      new CustomEvent<PosDisplaySnapshot>(`${CHANNEL_PREFIX}-local:${sessionId}`, {
        detail: snapshot,
      }),
    );
    const channel = getChannel(sessionId);
    channel?.postMessage(snapshot);
    channel?.close();
  } catch (error) {
    console.error("Failed to publish local POS display snapshot:", error);
  }
}

async function publishRemoteSnapshot(
  config: PosDisplaySessionConfig,
  snapshot: Omit<PosDisplaySnapshot, "updatedAt">,
) {
  const response = await fetch(`/api/pos/display/session/${config.sessionId}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot }),
  });
  if (response.ok) return;

  const error = new Error(`POS_DISPLAY_SYNC_${response.status}`);
  if (response.status === 404 || response.status === 410) {
    clearSessionConfig(config.sessionId);
    throw Object.assign(error, { staleSession: true });
  }
  throw error;
}

async function syncRemoteSnapshot(
  snapshot: Omit<PosDisplaySnapshot, "updatedAt">,
) {
  try {
    let config = await getOrCreatePosDisplaySession();
    try {
      await publishRemoteSnapshot(config, snapshot);
      return;
    } catch (error) {
      if (!(error instanceof Error) || !("staleSession" in error)) throw error;
    }

    config = await getOrCreatePosDisplaySession();
    const localSnapshot: PosDisplaySnapshot = {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    };
    publishLocalSnapshot(config.sessionId, localSnapshot);
    await publishRemoteSnapshot(config, snapshot);
  } catch (error) {
    warnDisplaySync(error);
  }
}

export function publishPosDisplaySnapshot(
  snapshot: Omit<PosDisplaySnapshot, "updatedAt">,
) {
  if (!canUseBrowserStorage()) return;
  latestSnapshot = snapshot;

  void getOrCreatePosDisplaySession()
    .then((config) => {
      const localSnapshot: PosDisplaySnapshot = {
        ...snapshot,
        updatedAt: new Date().toISOString(),
      };
      publishLocalSnapshot(config.sessionId, localSnapshot);
      void syncRemoteSnapshot(snapshot);
    })
    .catch(warnDisplaySync);
}

export function startPosDisplayHeartbeat() {
  if (!canUseBrowserStorage()) return () => undefined;
  void getOrCreatePosDisplaySession().catch(warnDisplaySync);
  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
  heartbeatTimer = window.setInterval(() => {
    if (!latestSnapshot) return;
    void syncRemoteSnapshot(latestSnapshot);
  }, HEARTBEAT_MS);

  return () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };
}

export function subscribePosDisplaySnapshot(
  sessionId: string,
  displayToken: string,
  onSnapshot: (snapshot: PosDisplaySnapshot) => void,
  onConnectionChange: (state: PosDisplayConnectionState) => void,
) {
  if (!canUseBrowserStorage() || !sessionId || !displayToken) {
    onConnectionChange("invalid");
    return () => undefined;
  }

  const localSnapshot = readPosDisplaySnapshot(sessionId);
  if (localSnapshot.updatedAt !== emptyPosDisplaySnapshot.updatedAt) {
    onSnapshot(localSnapshot);
  }
  onConnectionChange("connecting");

  const channel = getChannel(sessionId);
  const localEventName = `${CHANNEL_PREFIX}-local:${sessionId}`;
  let stopped = false;
  let pollTimer: number | null = null;
  let consecutiveFailures = 0;

  const receiveSnapshot = (snapshot: PosDisplaySnapshot) => {
    onSnapshot({ ...emptyPosDisplaySnapshot, ...snapshot });
    const age = Date.now() - new Date(snapshot.updatedAt).getTime();
    onConnectionChange(age > STALE_AFTER_MS ? "stale" : "connected");
  };

  const handleMessage = (event: MessageEvent<PosDisplaySnapshot>) => {
    receiveSnapshot(event.data);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== snapshotStorageKey(sessionId) || !event.newValue) return;
    try {
      receiveSnapshot(JSON.parse(event.newValue) as PosDisplaySnapshot);
    } catch {
      onConnectionChange("stale");
    }
  };
  const handleLocal = (event: Event) => {
    receiveSnapshot(
      (event as CustomEvent<PosDisplaySnapshot>).detail ??
        readPosDisplaySnapshot(sessionId),
    );
  };

  const poll = async () => {
    try {
      const response = await fetch(
        `/api/pos/display/session/${sessionId}?token=${encodeURIComponent(displayToken)}`,
        { cache: "no-store" },
      );
      if (response.status === 404) {
        stopped = true;
        onConnectionChange("invalid");
        return;
      }
      if (!response.ok) throw new Error("Display sync failed");
      const data = (await response.json()) as {
        snapshot?: PosDisplaySnapshot | null;
      };
      consecutiveFailures = 0;
      if (data.snapshot) receiveSnapshot(data.snapshot);
      else onConnectionChange("connecting");
    } catch {
      consecutiveFailures += 1;
      onConnectionChange(consecutiveFailures >= 2 ? "disconnected" : "stale");
    } finally {
      if (!stopped) pollTimer = window.setTimeout(poll, POLL_MS);
    }
  };

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(localEventName, handleLocal);
  void poll();

  return () => {
    stopped = true;
    if (pollTimer) window.clearTimeout(pollTimer);
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(localEventName, handleLocal);
  };
}
