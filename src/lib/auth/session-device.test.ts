import { describe, expect, it } from "vitest";

import { getSessionDevice } from "./session-device";

function requestWithUserAgent(userAgent: string) {
  return new Request("https://bakery.example", {
    headers: {
      "User-Agent": userAgent,
      "X-Forwarded-For": "203.0.113.5, 10.0.0.1",
    },
  });
}

describe("session device labels", () => {
  it.each([
    ["Mozilla/5.0 [FBAN/MessengerForiOS;FBAV/1.0] iPhone", "Messenger · iPhone/iPad"],
    ["Mozilla/5.0 [FBAN/FB4A;FBAV/1.0] Android", "Facebook · Android"],
    ["Mozilla/5.0 Zalo Android", "Zalo · Android"],
  ])("labels isolated in-app browsers", (userAgent, expected) => {
    const device = getSessionDevice(requestWithUserAgent(userAgent));
    expect(device.deviceLabel).toBe(expected);
    expect(device.ipHash).toHaveLength(64);
    expect(device.ipHash).not.toContain("203.0.113.5");
  });
});
