import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Toast } from "./Toast";

describe("Toast Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders toast message when visible", () => {
    render(
      <Toast message="Test message" isVisible={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not render when not visible", () => {
    render(
      <Toast message="Test message" isVisible={false} onClose={mockOnClose} />,
    );

    expect(screen.queryByText("Test message")).not.toBeInTheDocument();
  });

  it("applies correct styling for success type", () => {
    render(
      <Toast
        message="Success message"
        type="success"
        isVisible={true}
        onClose={mockOnClose}
      />,
    );

    const toast = screen.getByRole("alert");
    expect(toast).toHaveClass("bg-green-500");
  });

  it("applies correct styling for error type", () => {
    render(
      <Toast
        message="Error message"
        type="error"
        isVisible={true}
        onClose={mockOnClose}
      />,
    );

    const toast = screen.getByRole("alert");
    expect(toast).toHaveClass("bg-red-500");
  });

  it("applies correct styling for info type", () => {
    render(
      <Toast
        message="Info message"
        type="info"
        isVisible={true}
        onClose={mockOnClose}
      />,
    );

    const toast = screen.getByRole("alert");
    expect(toast).toHaveClass("bg-blue-500");
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <Toast message="Test message" isVisible={true} onClose={mockOnClose} />,
    );

    const closeButton = screen.getByLabelText("Đóng thông báo");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("auto-closes after specified duration", async () => {
    render(
      <Toast
        message="Test message"
        isVisible={true}
        onClose={mockOnClose}
        duration={100}
      />,
    );

    // Wait for auto-close
    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 200 },
    );
  });

  it("does not auto-close when duration is 0", async () => {
    render(
      <Toast
        message="Test message"
        isVisible={true}
        onClose={mockOnClose}
        duration={0}
      />,
    );

    // Wait a bit to ensure it doesn't auto-close
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    render(
      <Toast message="Test message" isVisible={true} onClose={mockOnClose} />,
    );

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "polite");

    const closeButton = screen.getByLabelText("Đóng thông báo");
    expect(closeButton).toBeInTheDocument();
  });
});
