import { describe, expect, it } from "vitest";
import type { CartItem } from "@/types";
import {
  getTabItems,
  getTabTotals,
  normalizeTableCartItems,
} from "./pos-table-service";

function item(id: string, price: number, quantity: number): CartItem {
  return {
    cartItemId: id,
    productId: id,
    productName: `Món ${id}`,
    imageUrl: "",
    price,
    quantity,
  };
}

describe("pos table service totals", () => {
  it("combines immutable kitchen rounds with the current draft", () => {
    const tab = {
      rounds: [
        {
          id: "round-1",
          number: 1,
          items: [item("bread", 25_000, 2)],
          status: "queued" as const,
          sentAt: "2026-07-17T10:00:00.000Z",
          sentById: "staff-1",
          sentByName: "An",
        },
      ],
      draftItems: [item("coffee", 30_000, 1)],
    };

    expect(getTabItems(tab)).toHaveLength(2);
    expect(getTabTotals(tab)).toEqual({
      subtotal: 80_000,
      totalQuantity: 3,
    });
  });

  it("returns zeroes for a newly opened table", () => {
    expect(getTabTotals({ rounds: [], draftItems: [] })).toEqual({
      subtotal: 0,
      totalQuantity: 0,
    });
  });

  it("repairs missing cart item ids and merges duplicate variants", () => {
    const legacyItem = {
      productId: "bread",
      productName: "Bánh mì",
      imageUrl: "",
      selectedFlavor: "cheese",
      price: 5_000,
      quantity: 1,
    } as CartItem;

    const normalized = normalizeTableCartItems([legacyItem, legacyItem]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].cartItemId).toBe("bread|default|cheese||0");
    expect(normalized[0].quantity).toBe(2);
  });
});
