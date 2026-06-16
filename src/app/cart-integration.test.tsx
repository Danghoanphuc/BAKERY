import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomepageClient } from "./homepage-client";
import { StickyCart } from "@/components/layout/StickyCart";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types/product";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockProduct: Product = {
  id: "1",
  name: "Test Bánh",
  price: 100000,
  imageUrl: "https://test.com/image.jpg",
  categoryId: "1",
  description: "Test description",
  availableForDelivery: true,
  availableForPickup: true,
};

describe("Cart Integration", () => {
  beforeEach(() => {
    // Clear cart before each test
    useCartStore.getState().clearCart();
  });

  it("adds product to cart and triggers StickyCart to appear", async () => {
    const { rerender } = render(
      <div>
        <HomepageClient title="Test Collection" products={[mockProduct]} />
        <StickyCart />
      </div>,
    );

    // Initially, StickyCart should not be visible (cart is empty)
    expect(screen.queryByText("Xem giỏ hàng")).not.toBeInTheDocument();

    // Find and click the "Thêm" button
    const addButton = screen.getByText("Thêm");
    fireEvent.click(addButton);

    // Wait for the toast notification
    await waitFor(() => {
      expect(
        screen.getByText("Đã thêm Test Bánh vào giỏ hàng"),
      ).toBeInTheDocument();
    });

    // Re-render to update StickyCart with new cart state
    rerender(
      <div>
        <HomepageClient title="Test Collection" products={[mockProduct]} />
        <StickyCart />
      </div>,
    );

    // StickyCart should now be visible
    await waitFor(() => {
      expect(screen.getByText("Xem giỏ hàng")).toBeInTheDocument();
      expect(screen.getByText("1 món")).toBeInTheDocument();
      // Use aria-label to find the specific price in StickyCart
      expect(
        screen.getByLabelText(/Xem giỏ hàng với 1 món, tổng 100\.000 ₫/),
      ).toBeInTheDocument();
    });
  });

  it("handles multiple product additions and updates cart state", async () => {
    const { rerender } = render(
      <div>
        <HomepageClient title="Test Collection" products={[mockProduct]} />
        <StickyCart />
      </div>,
    );

    // Add product twice
    const addButton = screen.getByText("Thêm");
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // Wait for the second toast notification
    await waitFor(() => {
      expect(
        screen.getByText("Đã thêm Test Bánh vào giỏ hàng"),
      ).toBeInTheDocument();
    });

    // Re-render to update StickyCart
    rerender(
      <div>
        <HomepageClient title="Test Collection" products={[mockProduct]} />
        <StickyCart />
      </div>,
    );

    // StickyCart should show updated quantities
    await waitFor(() => {
      expect(screen.getByText("2 món")).toBeInTheDocument();
      // Use aria-label to find the specific price in StickyCart
      expect(
        screen.getByLabelText(/Xem giỏ hàng với 2 món, tổng 200\.000 ₫/),
      ).toBeInTheDocument();
    });
  });

  it("displays toast notification on successful add to cart", async () => {
    render(<HomepageClient title="Test Collection" products={[mockProduct]} />);

    const addButton = screen.getByText("Thêm");
    fireEvent.click(addButton);

    // Check that toast notification appears
    await waitFor(() => {
      expect(
        screen.getByText("Đã thêm Test Bánh vào giỏ hàng"),
      ).toBeInTheDocument();
    });

    // Check that toast has proper ARIA attributes
    const toast = screen.getByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("closes toast notification when close button is clicked", async () => {
    render(<HomepageClient title="Test Collection" products={[mockProduct]} />);

    const addButton = screen.getByText("Thêm");
    fireEvent.click(addButton);

    // Wait for toast to appear
    await waitFor(() => {
      expect(
        screen.getByText("Đã thêm Test Bánh vào giỏ hàng"),
      ).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByLabelText("Đóng thông báo");
    fireEvent.click(closeButton);

    // Toast should disappear
    await waitFor(() => {
      expect(
        screen.queryByText("Đã thêm Test Bánh vào giỏ hàng"),
      ).not.toBeInTheDocument();
    });
  });
});
