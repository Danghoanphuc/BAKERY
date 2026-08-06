import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WholesaleFinishedProductComposer } from "./WholesaleFinishedProductComposer";

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

describe("WholesaleFinishedProductComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      if (init?.method === "POST") {
        return Response.json({ product: { id: "product-1" } }, { status: 201 });
      }
      return Response.json([{
        id: "flour",
        code: "NL-FLOUR",
        name: "Bột mì",
        baseUnit: "gram",
        costPerBaseUnitMicros: 1_000_000_000,
        isActive: true,
      }]);
    }));
  });

  it("shows only the core wholesale fields and an inline BOM", async () => {
    render(<WholesaleFinishedProductComposer />);

    expect(await screen.findByRole("heading", {
      name: "Tạo thành phẩm bán sỉ",
    })).toBeInTheDocument();
    expect(screen.getByLabelText("Tên sản phẩm *")).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Giá sỉ \/ quy cách/)).toBeInTheDocument();
    expect(screen.getByLabelText("Quy cách đóng gói *")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "BOM & giá vốn" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Chiết khấu theo hạng đại lý")).not.toBeInTheDocument();
    expect(screen.queryByText("Phân phối và nguồn hàng")).not.toBeInTheDocument();
  });

  it("lets numeric fields stay empty and formats thousands while typing", async () => {
    render(<WholesaleFinishedProductComposer />);
    await screen.findByRole("heading", { name: "Tạo thành phẩm bán sỉ" });

    const wholesalePrice = screen.getByRole("spinbutton", {
      name: "Giá sỉ / quy cách",
    });
    expect(wholesalePrice).toHaveValue("");

    fireEvent.focus(wholesalePrice);
    fireEvent.change(wholesalePrice, { target: { value: "120000" } });
    expect(wholesalePrice).toHaveValue("120.000");

    fireEvent.change(wholesalePrice, { target: { value: "" } });
    expect(wholesalePrice).toHaveValue("");
  });

  it("calculates cost from BOM and submits it with the product", async () => {
    render(<WholesaleFinishedProductComposer />);
    await screen.findByRole("heading", { name: "Tạo thành phẩm bán sỉ" });

    fireEvent.change(screen.getByLabelText("Tên sản phẩm *"), {
      target: { value: "Croissant bơ" },
    });
    fireEvent.change(screen.getByLabelText("SKU"), {
      target: { value: "tp-croissant" },
    });
    fireEvent.change(screen.getByLabelText(/^Giá sỉ \/ quy cách/), {
      target: { value: "120000" },
    });
    fireEvent.change(screen.getByLabelText("Quy cách đóng gói *"), {
      target: { value: "Khay 6" },
    });
    fireEvent.change(screen.getByLabelText(/^Số sản phẩm \/ quy cách/), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByLabelText(/^Sản lượng đạt chuẩn \/ mẻ/), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Nguyên liệu"), {
      target: { value: "flour" },
    });
    fireEvent.change(screen.getByLabelText(/^Định lượng nguyên liệu 1/), {
      target: { value: "200" },
    });

    expect(screen.getByText("Giá vốn / sản phẩm").parentElement)
      .toHaveTextContent("10.000");
    expect(screen.getByText("Giá vốn / quy cách").parentElement)
      .toHaveTextContent("60.000");
    expect(screen.getByText("Lãi gộp dự kiến").parentElement)
      .toHaveTextContent("50.0%");

    fireEvent.click(screen.getByRole("button", { name: "Tạo thành phẩm" }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/wholesale/inventory");
    });
    const fetchMock = vi.mocked(fetch);
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      product: { sku: "TP-CROISSANT" },
      bom: {
        yieldQuantity: 20,
        ingredients: [{ ingredientId: "flour", quantity: 200 }],
      },
    });
  });
});
