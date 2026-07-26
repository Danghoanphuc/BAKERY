import { describe, expect, it } from "vitest";
import {
  formatIngredientCode,
  normalizeIngredientGroup,
} from "./ingredient-code";

describe("ingredient identifiers", () => {
  it("formats stable group-based sequential codes", () => {
    expect(formatIngredientCode("bot", 12)).toBe("NL-BOT-0012");
  });

  it("falls back to KHAC for unsupported groups", () => {
    expect(normalizeIngredientGroup("unknown")).toBe("KHAC");
    expect(formatIngredientCode("unknown", 1)).toBe("NL-KHAC-0001");
  });
});
