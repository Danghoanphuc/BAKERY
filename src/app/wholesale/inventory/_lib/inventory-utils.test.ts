import { describe, expect, it } from "vitest";

import type { InventoryBalance, Product } from "@/types";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import {
  applyInventoryLedger,
  getInventoryStatsFromLedger,
  summarizeInventoryBalances,
} from "./inventory-utils";

const product = (overrides: Partial<Product>): Product =>
  ({
    id: "item",
    name: "Mặt hàng",
    price: 0,
    imageUrl: "",
    ...overrides,
  }) as Product;

describe("inventory ledger projection", () => {
  it("aggregates quantity and actual inventory value across locations", () => {
    const balances: InventoryBalance[] = [
      {
        itemType: "ingredient",
        itemId: "flour",
        locationId: "main",
        quantity: 40_000,
        inventoryValue: 600_000,
      },
      {
        itemType: "ingredient",
        itemId: "flour",
        locationId: "branch",
        quantity: 20_000,
        inventoryValue: 320_000,
      },
    ];

    expect(summarizeInventoryBalances(balances)).toEqual({
      flour: {
        quantity: 60_000,
        inventoryValue: 920_000,
        locationCount: 2,
      },
    });
  });

  it("uses ledger quantity and keeps legacy stock only without a ledger entry", () => {
    const products = [
      product({ id: "flour", stock: 13 }),
      product({ id: "cake", stock: 2 }),
    ];

    expect(
      applyInventoryLedger(products, {
        flour: { quantity: 40_000, inventoryValue: 600_000, locationCount: 1 },
      }).map(({ id, stock }) => ({ id, stock })),
    ).toEqual([
      { id: "flour", stock: 40_000 },
      { id: "cake", stock: 2 },
    ]);
  });

  it("calculates inventory value from ledger and fallback cost, not selling price", () => {
    const products = [
      product({
        id: "flour",
        itemType: "ingredient",
        stock: 40_000,
        purchasePackQuantity: 40_000,
        referencePurchasePrice: 600_000,
      }),
      product({
        id: "cake",
        itemType: "finished_good",
        stock: 2,
        price: 100_000,
      }),
    ];
    const ledger = {
      flour: { quantity: 40_000, inventoryValue: 600_000, locationCount: 1 },
    };
    const costing = {
      cake: {
        productId: "cake",
        source: "legacy",
        totalCost: 30_000,
        unitCost: {
          source: "legacy",
          ingredientsCost: 0,
          packagingCost: 0,
          laborCost: 0,
          overheadCost: 0,
          totalCost: 30_000,
        },
      },
    } as unknown as Record<string, ProductCostSummary>;

    const stats = getInventoryStatsFromLedger(products, ledger, costing);

    expect(stats.inventoryValue).toBe(660_000);
    expect(stats.ledgerItems).toBe(1);
    expect(stats.legacyItems).toBe(1);
  });
});
