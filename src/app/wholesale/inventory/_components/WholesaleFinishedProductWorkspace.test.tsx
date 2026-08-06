import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import type { InventoryBalance, Product, WholesaleProduct } from "@/types";
import { WholesaleFinishedProductWorkspace } from "./WholesaleFinishedProductWorkspace";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

const product = {
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
} satisfies Product;

const offer = {
  id: "offer-1",
  productId: "product-1",
  productName: "Bánh bao xanh",
  wholesalePrice: 16_000,
  minimumOrderQuantity: 1,
  stock: 0,
  isAvailable: true,
  sellUnitLabel: "Bì 10",
  unitsPerSellUnit: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies WholesaleProduct;

const costingSummary = {
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
    lines: [{
      ingredientId: "flour",
      ingredientName: "Bột mì",
      quantity: 4_000,
      baseUnit: "gram",
      unitCost: 25,
      lineCost: 100_000,
    }],
  },
} satisfies ProductCostSummary;

describe("WholesaleFinishedProductWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins wholesale price, BOM cost, margin and inventory", () => {
    const balances = [{
      itemType: "product",
      itemId: "product-1",
      locationId: "main",
      quantity: 35,
      inventoryValue: 23_800,
    }] satisfies InventoryBalance[];

    render(
      <WholesaleFinishedProductWorkspace
        product={product}
        offer={offer}
        costingSummary={costingSummary}
        balances={balances}
        onBack={() => {}}
        onOfferChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "Bánh bao xanh" }))
      .toBeInTheDocument();
    expect(screen.getByText("Giá sỉ / Bì 10").parentElement)
      .toHaveTextContent("16.000");
    expect(screen.getByText("Giá vốn / quy cách").parentElement)
      .toHaveTextContent("6.800");
    expect(screen.getByText("Biên lợi nhuận").parentElement)
      .toHaveTextContent("57.5%");
    expect(screen.getByText("Tồn khả dụng").parentElement)
      .toHaveTextContent("3 Bì 10");
    expect(screen.getByText("Bột mì")).toBeInTheDocument();
    expect(screen.getByText("25 ₫ / g")).toBeInTheDocument();
    expect(screen.getByText("100.000 ₫")).toBeInTheDocument();
  });

  it("updates the wholesale offer without touching retail fields", async () => {
    const onOfferChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ...offer,
      wholesalePrice: 20_000,
    })));

    render(
      <WholesaleFinishedProductWorkspace
        product={product}
        offer={offer}
        costingSummary={costingSummary}
        balances={[]}
        onBack={() => {}}
        onOfferChange={onOfferChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", {
      name: "Giá sỉ / quy cách",
    }), {
      target: { value: "20000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      expect(onOfferChange).toHaveBeenCalledWith(
        expect.objectContaining({ wholesalePrice: 20_000 }),
      );
      expect(screen.getByRole("status")).toHaveTextContent("Đã lưu");
    });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wholesale/catalog/offers/offer-1",
      expect.objectContaining({ method: "PUT" }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      wholesalePrice: 20_000,
      sellUnitLabel: "Bì 10",
      unitsPerSellUnit: 10,
    });
  });
});
