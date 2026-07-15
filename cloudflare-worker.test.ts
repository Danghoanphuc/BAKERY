import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "./cloudflare-worker.js";

const env = {
  ORIGIN: "https://origin.example",
  NEXT_PUBLIC_CUSTOMER_APP_URL: "https://bakery.example",
};

afterEach(() => {
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
});
