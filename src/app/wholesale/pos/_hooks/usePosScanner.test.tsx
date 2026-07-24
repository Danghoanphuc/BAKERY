import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";
import { classifyScannerInput, usePosScanner } from "./usePosScanner";

const croissant: Product = {
  id: "croissant",
  name: "Croissant Bơ Pháp",
  price: 35_000,
  imageUrl: "",
  sku: "CRO-001",
  isAvailable: true,
  availableForPickup: true,
  availableToday: true,
};

function ScannerHarness({
  onAddProduct,
}: {
  onAddProduct: (
    product: Product,
    options?: { selectedSize?: string; selectedFlavor?: string },
  ) => void;
}) {
  const [value, setValue] = useState("");
  const { feedback, handleSearchKeyDown } = usePosScanner({
    products: [croissant],
    onAddProduct,
    onScanVoucher: vi.fn(),
    onScanCustomer: vi.fn(),
  });

  return (
    <>
      <input
        aria-label="Tìm sản phẩm"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => handleSearchKeyDown(event, value, setValue)}
      />
      <output>{feedback.message}</output>
    </>
  );
}

describe("usePosScanner", () => {
  it("keeps manual search text when Enter is pressed", () => {
    const onAddProduct = vi.fn();
    render(<ScannerHarness onAddProduct={onAddProduct} />);

    const input = screen.getByRole("textbox", { name: "Tìm sản phẩm" });
    fireEvent.change(input, { target: { value: "Croissant" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("Croissant");
    expect(onAddProduct).not.toHaveBeenCalled();
  });

  it("captures a fast HID sequence from anywhere on the POS", async () => {
    const onAddProduct = vi.fn();
    render(<ScannerHarness onAddProduct={onAddProduct} />);

    for (const key of "CRO-001") fireEvent.keyDown(window, { key });
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() =>
      expect(onAddProduct).toHaveBeenCalledWith(croissant, {
        selectedSize: undefined,
        selectedFlavor: undefined,
      }),
    );
    expect(screen.getByText("Đã quét: Croissant Bơ Pháp")).toBeInTheDocument();
  });

  it("does not turn fuzzy search text into a scanned product", () => {
    expect(classifyScannerInput([croissant], "Croissant")).toEqual({
      type: "unknown",
      raw: "Croissant",
    });
  });

  it("supports prefixes and resolves a variant combination barcode", () => {
    const cake: Product = {
      ...croissant,
      id: "cake",
      sku: "CAKE",
      sizeOptions: [{ id: "20cm", label: "20 cm", priceAdjustment: 0 }],
      flavorOptions: [{ id: "choco", label: "Chocolate" }],
      variantCombinations: [
        {
          id: "cake-20-choco",
          sizeOptionId: "20cm",
          flavorOptionId: "choco",
          barcode: "8930000000001",
        },
      ],
    };

    expect(classifyScannerInput([cake], "P:8930000000001")).toMatchObject({
      type: "product",
      product: cake,
      selectedSize: "20cm",
      selectedFlavor: "choco",
    });
    expect(classifyScannerInput([cake], "V:SUMMER26")).toMatchObject({
      type: "voucher",
      code: "SUMMER26",
    });
    expect(classifyScannerInput([cake], "C:KH-1024")).toEqual({
      type: "customer",
      query: "KH-1024",
    });
  });
});
