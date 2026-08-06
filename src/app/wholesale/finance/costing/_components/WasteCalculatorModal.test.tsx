import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  calculateWasteBasisPoints,
  WasteCalculatorModal,
} from "./WasteCalculatorModal";

describe("WasteCalculatorModal", () => {
  it("calculates waste from planned and good output", () => {
    expect(
      calculateWasteBasisPoints({
        plannedQuantity: 140,
        goodQuantity: 130,
      }),
    ).toBe(714);
  });

  it("applies the calculated waste percentage to the BOM", () => {
    const onApply = vi.fn();
    render(
      <WasteCalculatorModal
        currentWastePercent={0}
        defaultGoodQuantity={130}
        initialCalculation={{
          plannedQuantity: 140,
          goodQuantity: 130,
        }}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    expect(screen.getAllByText("7,14%")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng vào BOM" }));
    expect(onApply).toHaveBeenCalledWith(7.14, {
      plannedQuantity: 140,
      goodQuantity: 130,
    });
  });
});
