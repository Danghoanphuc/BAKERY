import { describe, expect, it } from "vitest";

import {
  assertPasskeyRpMatchesCurrentHost,
  PasskeyDomainError,
} from "./passkey-client";

describe("passkey RP client guard", () => {
  it("accepts the current hostname and its parent RP ID", () => {
    expect(() =>
      assertPasskeyRpMatchesCurrentHost(
        "bakery.example",
        "checkout.bakery.example",
      ),
    ).not.toThrow();
  });

  it("rejects an infrastructure hostname before WebAuthn opens", () => {
    expect(() =>
      assertPasskeyRpMatchesCurrentHost("bakery.example", "shop.railway.app"),
    ).toThrow(PasskeyDomainError);
  });
});
