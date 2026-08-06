import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductionBomEditor } from "./ProductFormSections";

describe("ProductionBomEditor cost mapping", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows unit cost, BOM line amount, batch cost and output unit cost", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/finance/ingredients")) {
        return Response.json([{
          id: "flour", code: "NL-FLOUR", name: "Bột mì", baseUnit: "gram",
          costPerBaseUnitMicros: 25_000_000, isActive: true,
        }]);
      }
      if (url.endsWith("/finance/recipes")) {
        return Response.json([{
          id: "recipe-1", productId: "product-1", version: 1, status: "active",
          effectiveFrom: new Date().toISOString(), yieldQuantity: 10,
          ingredients: [{ ingredientId: "flour", quantity: 100 }],
          packagingCostPerBatch: 1_000, directLaborCostPerBatch: 0,
          overheadCostPerBatch: 0, wasteBasisPoints: 0,
        }]);
      }
      if (url.endsWith("/api/wholesale/products")) return Response.json([]);
      if (url.endsWith("/finance/costing-summary")) return Response.json({ byProductId: {} });
      if (url.endsWith("/finance/overhead-settings")) {
        return Response.json({
          utilitiesPerMonth: 0, equipmentDepreciationPerMonth: 0,
          premisesPerMonth: 0, maintenancePerMonth: 0,
          otherIndirectCostsPerMonth: 0, productiveHoursPerMonth: 0,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ProductionBomEditor productId="product-1" batchCycleMinutes={90} />);

    expect(await screen.findByText("25 ₫ / g")).toBeInTheDocument();
    expect(screen.getAllByText("2.500 ₫")).toHaveLength(2);
    expect(screen.getByText("3.500 ₫")).toBeInTheDocument();
    expect(screen.getByText("350 ₫")).toBeInTheDocument();
  });
});
