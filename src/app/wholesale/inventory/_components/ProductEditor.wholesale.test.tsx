import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductEditor } from "./ProductEditor";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ProductEditor wholesale detail routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/wholesale/categories")) {
        return Response.json([]);
      }
      if (url.endsWith("/api/wholesale/finance/costing-summary")) {
        return Response.json({
          byProductId: {
            "product-1": {
              productId: "product-1",
              source: "recipe",
              totalCost: 680,
              unitCost: {
                ingredientCost: 680,
                packagingCost: 0,
                directLaborCost: 0,
                overheadCost: 0,
                wasteCost: 0,
                totalCost: 680,
                source: "recipe",
                recipeVersionId: "recipe-1",
                costingVersion: "recipe:recipe-1:v1",
              },
              recipe: {
                id: "recipe-1",
                version: 1,
                yieldQuantity: 130,
                wasteBasisPoints: 0,
                lines: [],
              },
            },
          },
        });
      }
      if (url.includes("/api/wholesale/catalog/offers?productId=")) {
        return Response.json([{
          id: "offer-1",
          productId: "product-1",
          productName: "Bánh bao xanh",
          wholesalePrice: 16_000,
          minimumOrderQuantity: 1,
          stock: 0,
          isAvailable: true,
          sellUnitLabel: "Bì 10",
          unitsPerSellUnit: 10,
        }]);
      }
      if (url.includes("/api/wholesale/finance/inventory/balances")) {
        return Response.json([]);
      }
      if (url.endsWith("/api/wholesale/products/product-1")) {
        return Response.json({
          id: "product-1",
          name: "Bánh bao xanh",
          displayName: "Bánh bao xanh",
          itemType: "finished_good",
          catalogScope: "wholesale",
          lifecycleStatus: "active",
          sku: "TP-BAOXANH-01",
          baseUnit: "each",
          price: 0,
          imageUrl: "",
          stock: 0,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
  });

  it("uses the wholesale workspace when the product has a wholesale offer", async () => {
    render(<ProductEditor mode="edit" productId="product-1" />);

    expect(await screen.findByRole("heading", { name: "Bánh bao xanh" }))
      .toBeInTheDocument();
    expect(screen.getByText("Giá sỉ / Bì 10")).toBeInTheDocument();
    expect(screen.getByText("Biên lợi nhuận").parentElement)
      .toHaveTextContent("57.5%");
    expect(screen.queryByText(/Không gian quản lý/)).not.toBeInTheDocument();
    expect(screen.queryByText("Cửa hàng")).not.toBeInTheDocument();
  });
});
