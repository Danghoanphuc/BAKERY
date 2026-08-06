import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WholesaleFinishedProductEditor } from "./WholesaleFinishedProductEditor";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

describe("WholesaleFinishedProductEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/wholesale/categories")) {
        return Response.json([{ id: "bread", name: "Bánh mì" }]);
      }
      if (url.includes("/api/wholesale/finance/costing-summary")) {
        return Response.json({ byProductId: {} });
      }
      if (url.includes("/api/wholesale/finance/inventory/balances")) {
        return Response.json([{
          itemType: "product",
          itemId: "product-1",
          locationId: "main",
          quantity: 48,
          inventoryValue: 0,
        }]);
      }
      return Response.json([{
        id: "product-1",
        name: "Croissant bơ",
        displayName: "Croissant bơ",
        itemType: "finished_good",
        price: 0,
        imageUrl: "",
        sku: "TP-CROIS-01",
        stock: 48,
      }]);
    }));
  });

  it("renders a wholesale workbench without retail storefront fields", async () => {
    render(<WholesaleFinishedProductEditor />);

    expect(await screen.findByRole("heading", {
      name: "Tạo thành phẩm bán sỉ",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quy cách bán sỉ" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Giá và chính sách đại lý" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Phân phối và nguồn hàng" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Tên hiển thị website")).not.toBeInTheDocument();
    expect(screen.queryByText("Xem trước thẻ trang chủ")).not.toBeInTheDocument();
  });

  it("can link an existing finished product", async () => {
    render(<WholesaleFinishedProductEditor />);
    await screen.findByRole("heading", { name: "Tạo thành phẩm bán sỉ" });

    fireEvent.click(screen.getByRole("radio", { name: /Dùng thành phẩm đã có/ }));
    fireEvent.change(screen.getByLabelText(/Chọn thành phẩm/), {
      target: { value: "product-1" },
    });

    await waitFor(() => {
      expect(screen.getByText("TP-CROIS-01")).toBeInTheDocument();
      expect(screen.getByText("48 cái")).toBeInTheDocument();
    });
  });
});
