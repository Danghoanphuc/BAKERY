import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  calculateDirectLaborLineCost,
  DirectLaborCalculatorModal,
} from "./DirectLaborCalculatorModal";

describe("DirectLaborCalculatorModal", () => {
  it("calculates people multiplied by minutes and hourly rate", () => {
    expect(
      calculateDirectLaborLineCost({
        id: "line",
        role: "Thợ chính",
        people: 2,
        minutes: 90,
        hourlyRate: 40_000,
      }),
    ).toBe(120_000);
  });

  it("applies the calculated total to the BOM", () => {
    const onApply = vi.fn();
    render(
      <DirectLaborCalculatorModal
        batchCycleMinutes={130}
        currentDirectLaborCost={0}
        initialLines={[]}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    const spinButtons = screen.getAllByRole("spinbutton");
    expect(spinButtons[1]).toHaveDisplayValue("");
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.includes("Chu kỳ của mẻ là 130 phút") === true &&
          element.textContent?.includes(
            "không tự động tính thành giờ công",
          ) === true,
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Ví dụ: Thợ làm bánh"), {
      target: { value: "Thợ chính" },
    });
    fireEvent.change(spinButtons[1]!, { target: { value: "60" } });
    fireEvent.change(spinButtons[2]!, { target: { value: "40.000" } });

    expect(screen.getAllByText("40.000 ₫")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng vào BOM" }));
    expect(onApply).toHaveBeenCalledWith(
      40_000,
      expect.arrayContaining([
        expect.objectContaining({
          people: 1,
          minutes: 60,
          hourlyRate: 40_000,
        }),
      ]),
    );
  });
});
