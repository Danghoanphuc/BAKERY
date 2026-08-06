import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductionPlanShell } from "./ProductionPlanShell";

const group = {
  id: "sweet-dough",
  name: "Thau bánh mì ngọt",
  batchLabel: "thau",
  batchCapacity: 5_000,
  batchUnit: "gram",
  inputLines: [
    { itemType: "ingredient", itemId: "flour", quantityPerBatch: 3_000 },
    { itemType: "product", itemId: "sauce", quantityPerBatch: 500 },
  ],
  outputLines: [
    { productId: "round", quantityPerUnit: 60, targetQuantity: 100 },
    { productId: "long", quantityPerUnit: 80, targetQuantity: 70 },
    { productId: "sauce-bread", quantityPerUnit: 65, targetQuantity: 50 },
  ],
};

const products = [
  { id: "flour", name: "Bột mì", itemType: "ingredient", baseUnit: "gram", price: 0, imageUrl: "" },
  { id: "sauce", name: "Sốt", itemType: "semi_finished", baseUnit: "gram", price: 0, imageUrl: "" },
  { id: "round", name: "Bánh tròn", itemType: "finished_good", baseUnit: "each", price: 0, imageUrl: "" },
  { id: "long", name: "Bánh dài", itemType: "finished_good", baseUnit: "each", price: 0, imageUrl: "" },
  { id: "sauce-bread", name: "Bánh xịt sốt", itemType: "finished_good", baseUnit: "each", price: 0, imageUrl: "" },
];

const balances = [
  { itemType: "ingredient", itemId: "flour", locationId: "main", quantity: 7_000, inventoryValue: 0 },
  { itemType: "product", itemId: "sauce", locationId: "main", quantity: 2_000, inventoryValue: 0 },
  { itemType: "product", itemId: "round", locationId: "main", quantity: 20, inventoryValue: 0 },
  { itemType: "product", itemId: "long", locationId: "main", quantity: 15, inventoryValue: 0 },
  { itemType: "product", itemId: "sauce-bread", locationId: "main", quantity: 5, inventoryValue: 0 },
];

describe("ProductionPlanShell", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/production-plan/groups")) return Response.json([group]);
        if (url.endsWith("/products")) return Response.json(products);
        if (url.endsWith("/inventory/balances")) return Response.json(balances);
        return Response.json({ error: "Not found" }, { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefills system stock and shows the suggested batches, shapes and materials", async () => {
    render(<ProductionPlanShell />);

    expect(
      await screen.findByRole("heading", { name: "Kế hoạch sản xuất hôm nay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("80 cái")).toBeInTheDocument();
    expect(screen.getByText("55 cái")).toBeInTheDocument();
    expect(screen.getByText("45 cái")).toBeInTheDocument();
    expect(screen.getByText("9.000 g")).toBeInTheDocument();
    expect(screen.getByText("Thiếu 2.000 g")).toBeInTheDocument();
    expect(screen.getByText("Dư dự kiến")).toHaveTextContent("2.875 g");
  });

  it("prefills actual output and consumption when confirming the suggested plan", async () => {
    render(<ProductionPlanShell />);
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận sản lượng" }));

    expect(screen.getByRole("heading", { name: "Xác nhận sản lượng thực tế" })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Sản lượng thực tế/)[0]).toHaveValue(80);
    expect(screen.getAllByLabelText(/^Tiêu hao thực tế/)[0]).toHaveValue(9_000);
    expect(screen.getAllByText(/Thiếu 2\.000 g/)).toHaveLength(2);
  });
});
