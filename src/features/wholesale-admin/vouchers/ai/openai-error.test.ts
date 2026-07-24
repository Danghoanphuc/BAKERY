import { describe, expect, it } from "vitest";
import { classifyOpenAiFailure } from "./openai-error";

describe("classifyOpenAiFailure", () => {
  it("finds DNS failures nested inside SDK errors", () => {
    const dnsError = Object.assign(new Error("getaddrinfo ENOTFOUND api.openai.com"), { code: "ENOTFOUND" });
    const fetchError = Object.assign(new TypeError("fetch failed"), { cause: dnsError });
    const error = Object.assign(new Error("Connection error"), { cause: fetchError });

    expect(classifyOpenAiFailure(error)).toBe("network");
  });

  it("distinguishes quota, authentication and model access errors", () => {
    expect(classifyOpenAiFailure({ status: 429 })).toBe("quota");
    expect(classifyOpenAiFailure({ status: 401 })).toBe("authentication");
    expect(classifyOpenAiFailure({ status: 404, code: "model_not_found" })).toBe("model");
  });

  it("recognizes a missing server key", () => {
    expect(classifyOpenAiFailure(new Error("OPENAI_API_KEY_NOT_CONFIGURED"))).toBe("configuration");
  });
});
