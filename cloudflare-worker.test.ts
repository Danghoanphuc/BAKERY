import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "./cloudflare-worker.js";

const env = {
  ORIGIN: "https://origin.example",
  NEXT_PUBLIC_CUSTOMER_APP_URL: "https://bakery.example",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bakery edge router", () => {
  it("marks only Facebook in-app product requests", async () => {
    const fetchMock = vi.fn(async (_request: Request) => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await worker.fetch(
      new Request("https://bakery.example/san-pham/cake?fbclid=tracking", {
        headers: { "User-Agent": "Mozilla/5.0 [FBAN/FB4A;FBAV/1.0]" },
      }),
      env,
    );

    const originRequest = fetchMock.mock.calls[0]![0];
    expect(originRequest.url).toBe("https://origin.example/san-pham/cake");
    expect(originRequest.headers.get("X-Facebook-In-App")).toBe("1");
  });

  it("leaves Zalo product requests on the normal application flow", async () => {
    const fetchMock = vi.fn(async (_request: Request) => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await worker.fetch(
      new Request("https://bakery.example/san-pham/cake", {
        headers: { "User-Agent": "Mozilla/5.0 ZaloApp" },
      }),
      env,
    );

    const originRequest = fetchMock.mock.calls[0]![0];
    expect(originRequest.url).toBe("https://origin.example/san-pham/cake");
    expect(originRequest.headers.has("X-Facebook-In-App")).toBe(false);
  });

  it("keeps origin redirects on the public hostname", async () => {
    const fetchMock = vi.fn(async () =>
      Response.redirect("https://origin.example/cart?from=product", 307),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://bakery.example/san-pham/cake"),
      env,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://bakery.example/cart?from=product",
    );
    expect(fetchMock.mock.calls[0]![0].headers.get("X-Forwarded-Host")).toBe(
      "bakery.example",
    );
  });

  it("keeps Facebook crawler metadata separate from the customer UI", async () => {
    const fetchMock = vi.fn(async (_request: Request) => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await worker.fetch(
      new Request("https://bakery.example/san-pham/cake", {
        headers: { "User-Agent": "facebookexternalhit/1.1" },
      }),
      env,
    );

    const originRequest = fetchMock.mock.calls[0]![0];
    expect(originRequest.url).toBe(
      "https://origin.example/api/bot-meta/san-pham/cake",
    );
    expect(originRequest.headers.has("X-Facebook-In-App")).toBe(false);
  });

  it("retries transient origin failures before returning the Facebook page", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("cold", { status: 503 }))
      .mockResolvedValueOnce(new Response("warming", { status: 502 }))
      .mockResolvedValueOnce(new Response("ready", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = worker.fetch(
      new Request("https://bakery.example/san-pham/cake", {
        headers: { "User-Agent": "Mozilla/5.0 [FBAN/FB4A;FBAV/1.0]" },
      }),
      env,
    );
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries on the public hostname after repeated Facebook failures", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = worker.fetch(
      new Request(
        "https://bakery.example/san-pham/cake?fbclid=tracking&campaign=summer",
        {
          headers: { "User-Agent": "Mozilla/5.0 [FBAN/FB4A;FBAV/1.0]" },
        },
      ),
      env,
    );
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const location = new URL(response.headers.get("Location") || "");

    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://bakery.example");
    expect(location.pathname).toBe("/san-pham/cake");
    expect(location.searchParams.get("__fb_iab")).toBe("1");
    expect(location.searchParams.get("__edge_retry")).toBe("1");
    expect(location.searchParams.get("campaign")).toBe("summer");
    expect(location.searchParams.has("fbclid")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops public reloads without exposing the origin hostname", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const responsePromise = worker.fetch(
      new Request(
        "https://bakery.example/san-pham/cake?__edge_retry=2",
        {
          headers: { "User-Agent": "Mozilla/5.0 [FBAN/FB4A;FBAV/1.0]" },
        },
      ),
      env,
    );
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(503);
    expect(response.headers.has("Location")).toBe(false);
    expect(await response.text()).not.toContain("origin.example");
  });
});
