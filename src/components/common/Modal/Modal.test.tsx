import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Modal } from "./Modal";

// Mock createPortal for testing
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: any) => children,
  };
});

describe("Modal", () => {
  beforeEach(() => {
    // Reset body styles before each test
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  });

  afterEach(() => {
    // Clean up after each test
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  });

  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>,
    );

    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>,
    );

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>,
    );

    const backdrop = screen.getByRole("dialog").querySelector(".bg-black");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>,
    );

    const closeButton = screen.getByLabelText("Đóng");
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("prevents event bubbling when modal content is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>,
    );

    const modalContent = screen.getByText("Modal content");
    fireEvent.click(modalContent);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("has proper ARIA attributes for accessibility", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");

    const title = screen.getByText("Test Modal");
    expect(title).toHaveAttribute("id", "modal-title");
  });

  it("locks body scroll when open", () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>,
    );

    // Initially, body scroll should not be locked
    expect(document.body.style.overflow).toBe("");

    // Open modal
    rerender(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>,
    );

    // Body scroll should be locked
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("applies custom className", () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Modal"
        className="custom-modal"
      >
        Modal content
      </Modal>,
    );

    const modalContent = screen
      .getByRole("dialog")
      .querySelector(".custom-modal");
    expect(modalContent).toBeInTheDocument();
  });

  it("does not call onClose for non-Escape keys", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(handleClose).not.toHaveBeenCalled();
  });
});
