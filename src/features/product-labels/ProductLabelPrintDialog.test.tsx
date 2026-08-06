import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProductLabelPrintDialog,
  labelItemsForProduct,
  labelItemsForWholesaleOffer,
} from "./ProductLabelPrintDialog";
import type { Product } from "@/types";

describe("ProductLabelPrintDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("opens with the planned quantity and writes a printable label document", async () => {
    const write = vi.fn();
    const popup = {
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);

    render(
      <ProductLabelPrintDialog
        items={[
          {
            id: "bread",
            name: "Bánh mì ngọt",
            sku: "TP-BANHMI-01",
            barcode: "2001234567893",
            defaultQuantity: 2,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "In tem" }));
    expect(screen.getByRole("dialog", { name: "In tem sản phẩm" })).toBeInTheDocument();
    expect(screen.getByText("2 tem")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tùy chỉnh tem"));
    expect(screen.getByRole("combobox", { name: "Chiều cao mã" })).toHaveValue("low");
    fireEvent.change(screen.getByRole("combobox", { name: "Khổ tem" }), {
      target: { value: "35x22-double" },
    });
    expect(screen.getByText(/Mỗi trang gồm 1 tem logo SweetTime và 1 tem thông tin/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo SweetTime" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "In 2 cặp tem" }));

    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(write.mock.calls[0][0]).toContain("TP-BANHMI-01");
    expect(write.mock.calls[0][0]).toContain("@page { size: 70mm 22mm");
    expect(write.mock.calls[0][0].match(/<section class="sheet sheet-double">/g)).toHaveLength(2);
    expect(write.mock.calls[0][0].match(/sweetime-wordmark\.svg/g)).toHaveLength(2);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Đã đóng hộp thoại in 2 cặp tem.");
    });
  });

  it("disables a row that has neither SKU nor barcode", () => {
    render(
      <ProductLabelPrintDialog
        items={[{ id: "missing", name: "Chưa có mã", defaultQuantity: 1 }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "In tem" }));

    const dialog = screen.getByRole("dialog", { name: "In tem sản phẩm" });
    expect(screen.getByRole("checkbox", { name: "Chọn Chưa có mã" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "In tem" })).toBeDisabled();
  });

  it("applies the full preset and saves a custom layout for the selected size", () => {
    render(
      <ProductLabelPrintDialog
        items={[{
          id: "bread",
          name: "Bánh mì ngọt",
          sku: "TP-BANHMI-01",
          price: 25_000,
          defaultQuantity: 1,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "In tem" }));
    fireEvent.click(screen.getByText("Tùy chỉnh tem"));
    fireEvent.click(screen.getByRole("button", { name: "Đầy đủ" }));

    expect(screen.getByRole("checkbox", { name: "Giá bán" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "NSX" })).toBeChecked();
    expect(screen.getByText("25.000 ₫")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Canh chữ" }), {
      target: { value: "center" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));

    const saved = window.localStorage.getItem("sweettime:product-label-layout:50x30");
    expect(saved).toContain('"alignment":"center"');
    expect(screen.getByRole("status")).toHaveTextContent("Đã lưu thiết lập cho khổ 50 × 30 mm.");
  });

  it("updates the expiry date in both preview and print output", async () => {
    const write = vi.fn();
    const popup = {
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);

    render(
      <ProductLabelPrintDialog
        items={[{
          id: "bread",
          name: "Bánh bao xanh",
          sku: "TP-BAOXANH-01",
          defaultQuantity: 1,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "In tem" }));
    fireEvent.click(screen.getByText("Tùy chỉnh tem"));
    expect(screen.getByRole("checkbox", { name: "HSD" })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText("Hạn sử dụng (HSD)"), {
      target: { value: "2026-08-09" },
    });

    expect(screen.getByRole("checkbox", { name: "HSD" })).toBeChecked();
    expect(screen.getByText("HSD 09/08/2026")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "In 1 tem" }));
    await waitFor(() => expect(write.mock.calls[0][0]).toContain("HSD 09/08/2026"));
  });

  it("blocks printing when expiry precedes production date", () => {
    render(
      <ProductLabelPrintDialog
        items={[{
          id: "bread",
          name: "Bánh bao xanh",
          barcode: "2074315010342",
          defaultQuantity: 1,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "In tem" }));
    fireEvent.click(screen.getByText("Tùy chỉnh tem"));
    fireEvent.click(screen.getByRole("button", { name: "Đầy đủ" }));
    fireEvent.change(screen.getByLabelText("Ngày sản xuất"), {
      target: { value: "2026-08-09" },
    });
    fireEvent.change(screen.getByLabelText("Hạn sử dụng (HSD)"), {
      target: { value: "2026-08-08" },
    });
    fireEvent.change(screen.getByLabelText("Số mẻ / lô"), {
      target: { value: "M-0908" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Hạn sử dụng không được sớm hơn ngày sản xuất.",
    );
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "In 1 tem" }))
      .toBeDisabled();
  });

  it("builds a wholesale label from the sell-unit identity", () => {
    const product = {
      id: "bread",
      name: "Bánh bao",
      price: 12_000,
      imageUrl: "",
      sku: "TP-BAO-01",
      barcode: "2074315010342",
    } satisfies Product;

    expect(labelItemsForWholesaleOffer(product, {
      wholesalePrice: 60_000,
      sellUnitLabel: "Khay 6",
      unitsPerSellUnit: 6,
      sellUnitSku: "SI-BAO-KHAY6-01",
      sellUnitBarcode: "10012345678902",
    })).toEqual([expect.objectContaining({
      sku: "SI-BAO-KHAY6-01",
      barcode: "10012345678902",
      price: 60_000,
      variantLabel: "Khay 6 · 6 sản phẩm / quy cách",
    })]);
  });

  it("does not preselect a disabled variant", () => {
    const product = {
      id: "bread",
      name: "Bánh bao",
      price: 12_000,
      imageUrl: "",
      sku: "TP-BAO-01",
      barcode: "2074315010342",
      sizeOptions: [{ id: "small", label: "Nhỏ", priceAdjustment: 0 }],
      flavorOptions: [{ id: "pork", label: "Thịt", priceAdjustment: 0 }],
      variantCombinations: [{
        id: "small-pork",
        sizeOptionId: "small",
        flavorOptionId: "pork",
        sku: "TP-BAO-NHO-THIT",
        barcode: "2001234567893",
        isAvailable: false,
      }],
    } satisfies Product;
    const items = labelItemsForProduct(product);
    const disabledVariant = items.find((item) => item.id.includes("combination"));

    expect(disabledVariant?.disabledReason).toBe("Biến thể đang ngừng bán");
  });
});
