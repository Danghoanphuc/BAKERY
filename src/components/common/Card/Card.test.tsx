import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children content", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies base card styles", () => {
    render(<Card>Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("bg-white", "rounded-lg", "shadow-sm", "p-4");
  });

  it("handles click when onClick is provided", () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable card</Card>);

    const card = screen.getByText("Clickable card");
    expect(card).toHaveClass("cursor-pointer");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabIndex", "0");

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard navigation when interactive", () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Keyboard accessible</Card>);

    const card = screen.getByText("Keyboard accessible");

    // Test Enter key
    fireEvent.keyDown(card, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(card, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Test other keys don't trigger
    fireEvent.keyDown(card, { key: "Tab" });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it("does not add interactive attributes when onClick is not provided", () => {
    render(<Card>Static card</Card>);

    const card = screen.getByText("Static card");
    expect(card).not.toHaveClass("cursor-pointer");
    expect(card).not.toHaveAttribute("role", "button");
    expect(card).not.toHaveAttribute("tabIndex");
  });

  it("applies custom className", () => {
    render(<Card className="custom-class">Content</Card>);
    const card = screen.getByText("Content");
    expect(card).toHaveClass("custom-class");
  });

  it("has touch feedback classes when interactive", () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Touch feedback</Card>);

    const card = screen.getByText("Touch feedback");
    expect(card).toHaveClass("active:scale-98", "transition-transform");
  });
});
