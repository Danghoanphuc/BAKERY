import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { StickyCart } from "./StickyCart";
import { useCartStore } from "@/store/cartStore";
import { ProductCollection } from "@/features/home/components/ProductCollection";
import type { Product } from "@/types/product";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("StickyCart Integration Tests", () => {
  const mockPush = vi.fn();
  const mockUseRouter = vi.mocked(useRouter);

  const mockProduct: Product = {
    id: "test-product-1",
    name: "Test Bánh",
    price: 100000,
    imageUrl: "https://loremflickr.com/150/150?lock=test",
    categoryId: "1",
    description: "Test product description",
    availableForDelivery: true,
    availableForPickup: true,
  };

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

    // Clear cart before each test
    act(() => {
      useCartStore.getState().clearCart();
    });
  });

  it("shows sticky cart when product is added to cart via ProductCollection", async () => {
    const handleAddToCart = (product: Product) => {
      useCartStore.getState().addItem(product);
    };

    render(
      <>
        <ProductCollection
          title="Test Products"
          products={[mockProduct]}
          onAddToCart={handleAddToCart}
        />
        <StickyCart />
      </>,
    );

    // Initially, sticky cart should not be visible
    expect(screen.queryByText("Xem giỏ hàng")).not.toBeInTheDocument();

    // Add product to cart
    const addButton = screen.getByTestId("add-to-cart-btn");

    act(() => {
      fireEvent.click(addButton);
    });

    // Sticky cart should now be visible
    expect(screen.getByText("Xem giỏ hàng")).toBeInTheDocument();
    expect(screen.getByText("1 món")).toBeInTheDocument();

    // Check for price in sticky cart specifically (using more specific selector)
    const stickyCartButton = screen.getByRole("button", {
      name: /xem giỏ hàng/i,
    });
    expect(stickyCartButton).toHaveTextContent("100.000 ₫");
  });

  it("navigates to cart page when sticky cart is clicked", () => {
    const handleAddToCart = (product: Product) => {
      useCartStore.getState().addItem(product);
    };

    render(
      <>
        <ProductCollection
          title="Test Products"
          products={[mockProduct]}
          onAddToCart={handleAddToCart}
        />
        <StickyCart />
      </>,
    );

    // Add product to show sticky cart
    const addButton = screen.getByTestId("add-to-cart-btn");

    act(() => {
      fireEvent.click(addButton);
    });

    // Click sticky cart
    const stickyCartButton = screen.getByRole("button", {
      name: /xem giỏ hàng/i,
    });
    fireEvent.click(stickyCartButton);

    // Should navigate to cart page
    expect(mockPush).toHaveBeenCalledWith("/cart");
  });
});
