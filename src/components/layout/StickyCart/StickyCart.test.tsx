import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { StickyCart } from "./StickyCart";
import { useCartStore } from "@/store/cartStore";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock cart store
vi.mock("@/store/cartStore", () => ({
  useCartStore: vi.fn(),
}));

describe("StickyCart", () => {
  const mockPush = vi.fn();
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseCartStore = vi.mocked(useCartStore);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("does not render when cart is empty", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 0,
      totalPrice: 0,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<StickyCart />);

    expect(screen.queryByText("Xem giỏ hàng")).not.toBeInTheDocument();
  });

  it("renders with cart items and displays quantity and price", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 3,
      totalPrice: 150000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<StickyCart />);

    expect(screen.getByText("3 món")).toBeInTheDocument();
    expect(screen.getByText("150.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Xem giỏ hàng")).toBeInTheDocument();
  });

  it("displays correct quantity badge", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 5,
      totalPrice: 250000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<StickyCart />);

    // Check quantity badge
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("navigates to cart page when clicked", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 2,
      totalPrice: 100000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<StickyCart />);

    const cartButton = screen.getByRole("button", {
      name: /xem giỏ hàng với 2 món/i,
    });

    fireEvent.click(cartButton);

    expect(mockPush).toHaveBeenCalledWith("/cart");
  });

  it("has proper accessibility attributes", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 1,
      totalPrice: 50000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    render(<StickyCart />);

    const cartButton = screen.getByRole("button");
    const ariaLabel = cartButton.getAttribute("aria-label");
    expect(ariaLabel).toContain("Xem giỏ hàng với 1 món");
    expect(ariaLabel).toContain("50.000");
  });

  it("applies custom className when provided", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 1,
      totalPrice: 50000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    const { container } = render(<StickyCart className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("has proper styling classes for fixed positioning", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 1,
      totalPrice: 50000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    const { container } = render(<StickyCart />);

    expect(container.firstChild).toHaveClass(
      "fixed",
      "bottom-0",
      "left-0",
      "right-0",
      "z-50",
    );
  });

  it("has slide-up animation class", () => {
    mockUseCartStore.mockReturnValue({
      totalQuantity: 1,
      totalPrice: 50000,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    const { container } = render(<StickyCart />);

    expect(container.firstChild).toHaveClass("animate-slide-up");
  });
});
