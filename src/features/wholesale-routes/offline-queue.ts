"use client";

const STORAGE_KEY_PREFIX = "sweettime:field-route-mutations:v1";

type QueuedMutation = {
  id: string;
  url: string;
  method: "PATCH";
  body: Record<string, unknown>;
  queuedAt: string;
};

function storageKey(principalId: string) {
  return `${STORAGE_KEY_PREFIX}:${principalId}`;
}

function readQueue(principalId: string): QueuedMutation[] {
  try {
    const value = window.localStorage.getItem(storageKey(principalId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(principalId: string, queue: QueuedMutation[]) {
  window.localStorage.setItem(storageKey(principalId), JSON.stringify(queue));
}

function enqueue(
  principalId: string,
  mutation: Omit<QueuedMutation, "id" | "queuedAt">,
) {
  const queued = {
    ...mutation,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  };
  writeQueue(principalId, [...readQueue(principalId), queued]);
  return queued;
}

export async function sendRouteMutation(
  url: string,
  body: Record<string, unknown>,
  principalId: string,
) {
  if (!navigator.onLine) {
    enqueue(principalId, { url, method: "PATCH", body });
    return { queued: true as const };
  }
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Không thể cập nhật điểm ghé.");
    return { queued: false as const, data };
  } catch (error) {
    if (error instanceof TypeError) {
      enqueue(principalId, { url, method: "PATCH", body });
      return { queued: true as const };
    }
    throw error;
  }
}

export async function flushRouteMutationQueue(principalId: string) {
  const queue = readQueue(principalId);
  if (!navigator.onLine) return { flushed: 0, remaining: queue.length };
  let flushed = 0;
  for (const mutation of queue) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation.body),
      });
      if (!response.ok) break;
      flushed += 1;
    } catch {
      break;
    }
  }
  writeQueue(principalId, queue.slice(flushed));
  return { flushed, remaining: queue.length - flushed };
}
