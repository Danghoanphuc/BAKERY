import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("posDisplayStore", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("creates and reuses a session scoped to the current POS tab", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: "counter-a",
        displayToken: "read-token",
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOrCreatePosDisplaySession, getPosDisplayUrl } = await import(
      "./posDisplayStore"
    );
    const first = await getOrCreatePosDisplaySession();
    const second = await getOrCreatePosDisplaySession();

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getPosDisplayUrl(first)).toContain("session=counter-a");
    expect(getPosDisplayUrl(first)).toContain("token=read-token");
  });

  it("receives a server snapshot and reports a healthy connection", async () => {
    const updatedAt = new Date().toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          snapshot: {
            status: "editing",
            items: [],
            subtotal: 0,
            discountAmount: 0,
            totalAmount: 0,
            updatedAt,
          },
        }),
      }),
    );

    const { subscribePosDisplaySnapshot } = await import("./posDisplayStore");
    const onSnapshot = vi.fn();
    const onConnection = vi.fn();
    const unsubscribe = subscribePosDisplaySnapshot(
      "counter-a",
      "read-token",
      onSnapshot,
      onConnection,
    );

    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    expect(onConnection).toHaveBeenLastCalledWith("connected");
    unsubscribe();
  });

  it("replaces a server-side stale session and retries the snapshot once", async () => {
    const firstSession = {
      sessionId: "counter-stale",
      displayToken: "old-token",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };
    const replacement = {
      sessionId: "counter-new",
      displayToken: "new-token",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };
    sessionStorage.setItem(
      "bakery-pos-display-session",
      JSON.stringify(firstSession),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => replacement,
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const { publishPosDisplaySnapshot } = await import("./posDisplayStore");
    publishPosDisplaySnapshot({
      status: "idle",
      items: [],
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(
      JSON.parse(sessionStorage.getItem("bakery-pos-display-session") ?? "{}"),
    ).toMatchObject({ sessionId: "counter-new" });
  });
});
