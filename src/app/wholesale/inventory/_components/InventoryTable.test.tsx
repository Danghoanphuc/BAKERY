import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import type { Product, WholesaleProduct } from "@/types";
import { InventoryTable } from "./InventoryTable";

const product = {
  id: "product-1",
  name: "Bánh bao xanh",
  price: 0,
  imageUrl: "",
  itemType: "finished_good",
  isAvailable: true,
  stock: 0,
} as Product;

const offer = {
  id: "offer-1",
  productId: product.id,
  productName: product.name,
  wholesalePrice: 25_000,
  minimumOrderQuantity: 1,
  stock: 0,
  isAvailable: true,
  sellUnitLabel: "túi 10 bánh",
  createdAt: new Date(),
  updatedAt: new Date(),
} as WholesaleProduct;

describe("InventoryTable", () => {
  it("shows the wholesale offer price instead of the zero product price", () => {
    render(
      <InventoryTable
        products={[product]}
        categories={[]}
        wholesaleOffersByProductId={{ [product.id]: [offer] }}
        isLoading={false}
        searchTerm=""
        filter="all"
        onSearchChange={vi.fn()}
        onFilterChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleAvailability={vi.fn()}
      />,
    );

    expect(screen.getByText("25.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Giá sỉ / túi 10 bánh")).toBeInTheDocument();
    expect(screen.queryByText("0 ₫")).not.toBeInTheDocument();
  });

  it("labels semi-finished cost by its base unit without repeating it", () => {
    const semiFinished = {
      ...product,
      id: "semi-finished-1",
      name: "Sốt Cadé",
      itemType: "semi_finished",
      baseUnit: "gram",
      isAvailable: false,
    } as Product;
    const costing = {
      productId: semiFinished.id,
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
    } satisfies ProductCostSummary;

    render(
      <InventoryTable
        products={[semiFinished]}
        categories={[]}
        costingByProductId={{ [semiFinished.id]: costing }}
        isLoading={false}
        searchTerm=""
        filter="all"
        onSearchChange={vi.fn()}
        onFilterChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleAvailability={vi.fn()}
      />,
    );

    expect(screen.getByText("65 ₫ / g")).toBeInTheDocument();
    expect(screen.queryByText("cost 65 ₫ / g")).not.toBeInTheDocument();
  });
});
