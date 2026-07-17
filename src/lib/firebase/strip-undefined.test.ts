import { stripUndefined } from "./strip-undefined";

describe("stripUndefined", () => {
  it("removes undefined values recursively from Firestore payloads", () => {
    expect(
      stripUndefined({
        status: "confirmed",
        statusHistory: [
          { status: "confirmed", actor: "admin", note: undefined },
        ],
        cancelReason: undefined,
      }),
    ).toEqual({
      status: "confirmed",
      statusHistory: [{ status: "confirmed", actor: "admin" }],
    });
  });

  it("preserves non-plain Firestore-compatible values", () => {
    const date = new Date("2026-07-17T00:00:00.000Z");
    expect(stripUndefined({ updatedAt: date }).updatedAt).toBe(date);
  });

  it("removes undefined array entries", () => {
    expect(stripUndefined({ values: ["a", undefined, "b"] })).toEqual({
      values: ["a", "b"],
    });
  });
});
