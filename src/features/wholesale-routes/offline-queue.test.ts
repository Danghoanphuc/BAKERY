import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  flushRouteMutationQueue,
  sendRouteMutation,
} from "./offline-queue";

describe("field-route offline queue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps queued mutations isolated by signed-in principal", async () => {
    const online = vi
      .spyOn(window.navigator, "onLine", "get")
      .mockReturnValue(false);

    await sendRouteMutation("/route/a", { status: "arrived" }, "sales-a");
    await sendRouteMutation("/route/b", { status: "arrived" }, "sales-b");

    online.mockReturnValue(true);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(flushRouteMutationQueue("sales-a")).resolves.toEqual({
      flushed: 1,
      remaining: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/route/a",
      expect.objectContaining({ method: "PATCH" }),
    );

    await expect(flushRouteMutationQueue("sales-b")).resolves.toEqual({
      flushed: 1,
      remaining: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("queues a mutation when a connected request loses the network", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network"));

    await expect(
      sendRouteMutation("/route/a", { status: "completed" }, "sales-a"),
    ).resolves.toEqual({ queued: true });

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await expect(flushRouteMutationQueue("sales-a")).resolves.toEqual({
      flushed: 1,
      remaining: 0,
    });
  });
});
