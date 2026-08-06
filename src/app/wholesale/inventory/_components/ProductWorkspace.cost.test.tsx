import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import { createEmptyProductForm } from "../_lib/product-form";
import { ProductWorkspace } from "./ProductWorkspace";

describe("ProductWorkspace semi-finished cost", () => {
  it("does not divide an already per-unit BOM cost by the batch yield again", () => {
    const formData = {
      ...createEmptyProductForm(),
      name: "Sốt Cadé",
      itemType: "semi_finished" as const,
      baseUnit: "gram" as const,
      manufacturingOutputQuantity: 600,
      manufacturingOutputUnit: "g",
      isAvailable: false,
    };
    const costingSummary = {
      productId: "sauce-1",
      source: "recipe",
      totalCost: 65,
      unitCost: {
        ingredientCost: 65,
        packagingCost: 0,
        directLaborCost: 0,
        overheadCost: 0,
        wasteCost: 0,
        totalCost: 65,
        source: "recipe",
        costingVersion: "recipe:bom-2:v2",
      },
      recipe: {
        id: "bom-2",
        version: 2,
        yieldQuantity: 600,
        wasteBasisPoints: 0,
        lines: [],
      },
    } satisfies ProductCostSummary;

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/finance/inventory/balances")) {
        return Response.json([]);
      }
      return Response.json({
        days: 30,
        inventoryQuantity: 0,
        hasLedger: false,
        soldQuantity: 0,
        revenue: 0,
        deliveryQuantity: 0,
        reservedQuantity: 0,
        productionQuantity: 0,
        workInProgressAvailable: false,
        variants: [],
        recentMovements: [],
        recentOrders: [],
      });
    }));

    render(
      <ProductWorkspace
        productId="sauce-1"
        categories={[]}
        formData={formData}
        error={null}
        costingSummary={costingSummary}
        isSaving={false}
        setFormData={vi.fn()}
        onSubmit={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onCostingSummaryChange={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText("65 ₫")).toBeInTheDocument();
    expect(screen.getByText("Giá vốn / g")).toBeInTheDocument();
    expect(screen.queryByText("0 ₫")).not.toBeInTheDocument();
  });
});
