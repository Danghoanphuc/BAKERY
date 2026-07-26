import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FormattedNumberInput,
  formatNumericValue,
  parseNumericInput,
} from "./FormattedNumberInput";

describe("FormattedNumberInput", () => {
  it("shows a blank field instead of a default zero", () => {
    render(<FormattedNumberInput aria-label="Amount" value={0} onValueChange={() => {}} />);

    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveValue("");
  });

  it("groups digits while the user types", () => {
    const onValueChange = vi.fn();
    render(
      <FormattedNumberInput
        aria-label="Amount"
        value={0}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Amount" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "219972893" } });

    expect(input).toHaveValue("219.972.893");
    expect(onValueChange).toHaveBeenLastCalledWith(219_972_893);
  });

  it("emits null when the field is cleared", () => {
    const onValueChange = vi.fn();
    render(
      <FormattedNumberInput
        aria-label="Quantity"
        value={12}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity" }), {
      target: { value: "" },
    });

    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("supports Vietnamese decimal formatting", () => {
    expect(parseNumericInput("1234,56", 2)).toEqual({
      display: "1.234,56",
      value: 1234.56,
    });
    expect(formatNumericValue(1234.56, 2)).toBe("1.234,56");
  });

  it("does not reinterpret a Vietnamese thousands separator as a decimal", () => {
    expect(parseNumericInput("1.000", 3)).toEqual({
      display: "1.000",
      value: 1000,
    });
    expect(parseNumericInput("10.000", 3)).toEqual({
      display: "10.000",
      value: 10_000,
    });
    expect(parseNumericInput("1.000.000", 3)).toEqual({
      display: "1.000.000",
      value: 1_000_000,
    });
  });

  it("keeps a grouped quantity unchanged on blur", () => {
    const onValueChange = vi.fn();
    render(
      <FormattedNumberInput
        aria-label="Pack quantity"
        value={1000}
        min={0.001}
        step="any"
        maximumFractionDigits={3}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Pack quantity" });
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(input).toHaveValue("1.000");
    expect(onValueChange).not.toHaveBeenCalledWith(1);
  });

  it("accepts pasted US-formatted decimals", () => {
    expect(parseNumericInput("1,234.56", 2)).toEqual({
      display: "1.234,56",
      value: 1234.56,
    });
  });

  it("clamps a value to the configured range on blur", () => {
    const onValueChange = vi.fn();
    render(
      <FormattedNumberInput
        aria-label="Percent"
        value={0}
        min={0}
        max={100}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Percent" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "120" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("100");
    expect(onValueChange).toHaveBeenLastCalledWith(100);
  });
});
