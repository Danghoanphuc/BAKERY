import { describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { loadFinanceSummaryData } from "./finance-summary-data";

function createFirestore(
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>,
) {
  return {
    collection(name: string) {
      const snapshot = {
        docs: (collections[name] ?? []).map((document) => ({
          id: document.id,
          data: () => document.data,
        })),
      };
      return {
        get: async () => snapshot,
        orderBy: () => ({ get: async () => snapshot }),
      };
    },
  } as unknown as Firestore;
}

describe("loadFinanceSummaryData", () => {
  it("reads server collections and normalizes Firestore timestamps", async () => {
    const db = createFirestore({
      orders: [
        {
          id: "order-1",
          data: {
            createdAt: { seconds: 1_700_000_000 },
            updatedAt: { toDate: () => new Date("2024-01-02T00:00:00Z") },
            items: [],
          },
        },
      ],
      products: [{ id: "product-1", data: { name: "Bánh mì" } }],
      finance_expenses: [
        {
          id: "expense-1",
          data: {
            date: { seconds: 1_700_000_000 },
            category: "unknown",
            amount: 25_000,
          },
        },
      ],
    });

    const result = await loadFinanceSummaryData(db);

    expect(result.orders[0]?.createdAt).toEqual(
      new Date(1_700_000_000 * 1000),
    );
    expect(result.orders[0]?.updatedAt).toEqual(
      new Date("2024-01-02T00:00:00Z"),
    );
    expect(result.products[0]).toMatchObject({
      id: "product-1",
      name: "Bánh mì",
    });
    expect(result.expenses[0]).toMatchObject({
      id: "expense-1",
      category: "other",
      amount: 25_000,
    });
  });
});
