import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";
import InventoryPage, { buildInventoryCsv } from "./page";

const { push, toastSuccess, toastError } = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("./_components/InventoryStats", () => ({
  InventoryStats: () => <div data-testid="inventory-stats" />,
}));

vi.mock("./_components/InventoryTable", () => ({
  InventoryTable: ({ isLoading }: { isLoading: boolean }) => (
    <div data-testid="inventory-table" data-loading={String(isLoading)} />
  ),
}));

const products: Product[] = [
  {
    id: "product-1",
    name: "Bánh dâu",
    sku: "BD-01",
    price: 120_000,
    stock: 8,
    categoryId: "cake",
    imageUrl: "/cake.jpg",
    isAvailable: true,
  },
];

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(ok ? "" : "Request failed"),
  } as unknown as Response;
}

describe("InventoryPage utility menu", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/products") return Promise.resolve(jsonResponse(products));
      if (url === "/api/categories") {
        return Promise.resolve(
          jsonResponse([{ id: "cake", name: "Bánh", iconUrl: "" }]),
        );
      }
      if (url === "/api/admin/finance/costing-summary") {
        return Promise.resolve(
          jsonResponse({
            byProductId: {},
            coverage: { total: 1, recipe: 0, legacy: 0, missing: 1 },
          }),
        );
      }
      if (url === "/api/admin/inventory/workspace-card-template") {
        return Promise.resolve(jsonResponse({ ok: true }));
      }

      return Promise.resolve(jsonResponse({}, false));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("builds an Excel-compatible CSV with separate numeric columns", () => {
    const csv = buildInventoryCsv(products, [
      { id: "cake", name: "Bánh", iconUrl: "" },
    ]);
    const [separatorDirective, header, firstRow] = csv.split("\r\n");

    expect(separatorDirective).toBe("sep=;");
    expect(header).toBe(
      '"Tên sản phẩm";"SKU";"Danh mục";"Tồn kho";"Giá bán (VND)";"Trạng thái"',
    );
    expect(firstRow).toBe(
      '"Bánh dâu";"BD-01";"Bánh";8;120000;"Đang bán"',
    );
  });

  it("shows inventory before the costing summary finishes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/products") {
        return Promise.resolve(jsonResponse(products));
      }
      if (url === "/api/categories") {
        return Promise.resolve(
          jsonResponse([{ id: "cake", name: "Bánh", iconUrl: "" }]),
        );
      }
      if (url === "/api/admin/finance/costing-summary") {
        return new Promise<Response>(() => undefined);
      }
      return Promise.resolve(jsonResponse({}, false));
    });

    render(<InventoryPage />);

    await waitFor(() =>
      expect(screen.getByTestId("inventory-table")).toHaveAttribute(
        "data-loading",
        "false",
      ),
    );
  });

  it("keeps the routed create action in the header and moves secondary actions into a gear menu", async () => {
    render(<InventoryPage />);

    const utilityButton = await screen.findByRole("button", {
      name: "Mở tiện ích kho",
    });
    expect(
      screen.getByRole("button", { name: "Tạo mã kho" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Đồng bộ ảnh minh họa thẻ" }),
    ).not.toBeInTheDocument();

    fireEvent.click(utilityButton);

    expect(screen.getByRole("menu", { name: "Tiện ích kho" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Làm mới dữ liệu/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Xuất danh sách CSV/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Danh mục bán hàng/ })).toHaveAttribute(
      "href",
      "/admin/categories",
    );
    expect(
      screen.getByRole("menuitem", { name: /Nhóm nguyên liệu/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Đồng bộ ảnh minh họa thẻ/ }),
    ).toBeInTheDocument();
  });

  it("supports arrow-key navigation and restores focus on Escape", async () => {
    render(<InventoryPage />);

    const utilityButton = await screen.findByRole("button", {
      name: "Mở tiện ích kho",
    });
    fireEvent.click(utilityButton);

    const refreshItem = screen.getByRole("menuitem", { name: /Làm mới dữ liệu/ });
    const exportItem = screen.getByRole("menuitem", { name: /Xuất danh sách CSV/ });
    expect(refreshItem).toHaveFocus();

    fireEvent.keyDown(refreshItem, { key: "ArrowDown" });
    expect(exportItem).toHaveFocus();

    fireEvent.keyDown(exportItem, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(utilityButton).toHaveFocus();
  });

  it("refreshes inventory data from the utility menu", async () => {
    render(<InventoryPage />);
    await screen.findByTestId("inventory-table");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole("button", { name: "Mở tiện ích kho" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Làm mới dữ liệu/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(toastSuccess).toHaveBeenCalledWith("Đã làm mới dữ liệu kho.");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("exports the currently filtered inventory as CSV", async () => {
    const createObjectUrl = vi.fn(() => "blob:inventory");
    const revokeObjectUrl = vi.fn();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      }),
    );

    render(<InventoryPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole("button", { name: "Mở tiện ích kho" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Xuất danh sách CSV/ }));

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:inventory");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    anchorClick.mockRestore();
  });

  it("runs the card illustration sync from inside the utility menu", async () => {
    render(<InventoryPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole("button", { name: "Mở tiện ích kho" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Đồng bộ ảnh minh họa thẻ/ }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/inventory/workspace-card-template",
        { method: "POST" },
      ),
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "Đã đồng bộ minh hoạ thẻ sản phẩm.",
      ),
    );
    expect(toastError).not.toHaveBeenCalled();
  });
});
