import { describe, expect, it } from "vitest";

import {
  createVisitorToken,
  hashVisitorToken,
  readVisitorHash,
} from "./visitor";

describe("visitor token", () => {
  it("creates opaque random values and exposes only their hash to risk logic", () => {
    const first = createVisitorToken();
    const second = createVisitorToken();
    expect(first).not.toBe(second);
    expect(hashVisitorToken(first)).toMatch(/^[a-f0-9]{64}$/);

    const request = new Request("https://bakery.example", {
      headers: { cookie: `bakery_visitor=${first}` },
    });
    expect(readVisitorHash(request)).toBe(hashVisitorToken(first));
  });
});

