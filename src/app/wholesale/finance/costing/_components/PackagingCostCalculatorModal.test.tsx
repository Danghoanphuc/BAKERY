import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  calculatePackagingLineCost,
  PackagingCostCalculatorModal,
} from "./PackagingCostCalculatorModal";

describe("PackagingCostCalculatorModal", () => {
  it("calculates packaging quantity multiplied by unit cost", () => {
    expect(
      calculatePackagingLineCost({
        id: "box",
        name: "Hộp giấy",
        quantity: 12,
        unitCost: 2_500,
      }),
    ).toBe(30_000);
  });

  it("applies packaging lines and their total to the BOM", () => {
    const onApply = vi.fn();
    render(
      <PackagingCostCalculatorModal
        currentPackagingCost={0}
        initialLines={[
          {
            id: "box",
            name: "Hộp giấy",
            quantity: 12,
            unitCost: 2_500,
          },
        ]}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    expect(screen.getAllByText("30.000 ₫")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng vào BOM" }));
    expect(onApply).toHaveBeenCalledWith(
      30_000,
      expect.arrayContaining([expect.objectContaining({ id: "box" })]),
    );
  });
});
