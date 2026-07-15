import { afterEach, describe, expect, it } from "vitest";

import {
  createPasskeyChallengeCookie,
  getPasskeyConfig,
} from "./passkey";

describe("passkey configuration", () => {
  afterEach(() => {
    delete process.env.PASSKEY_ORIGIN;
    delete process.env.PASSKEY_RP_ID;
  });

  it("scopes credentials to the configured production origin", () => {
    process.env.PASSKEY_ORIGIN = "https://shop.example.com";
    process.env.PASSKEY_RP_ID = "example.com";
    expect(getPasskeyConfig()).toMatchObject({
      origin: "https://shop.example.com",
      rpId: "example.com",
    });
  });

  it("keeps challenge handles HttpOnly", () => {
    expect(createPasskeyChallengeCookie("opaque-id")).toContain("HttpOnly");
  });
});
