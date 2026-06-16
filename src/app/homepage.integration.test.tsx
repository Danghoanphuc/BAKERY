import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { vi } from "vitest";
import HomePage from "./page";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

const mockPush = vi.fn();

beforeEach(() => {
  (useRouter as any).mockReturnValue({
    push: mockPush,
  });

  useCartStore.getState().clearCart();
  useOrderConfigStore.getState().setDeliveryMode("delivery");

  mockPush.mockClear();
});

describe("Homepage Integration", () => {
  it("should render all main sections", async () => {
    render(await HomePage());

    expect(
      screen.getByPlaceholderText("Bạn muốn tìm bánh gì hôm nay?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Giảm 20% tất cả bánh sinh nhật"),
    ).toBeInTheDocument();
    expect(screen.getByText("Giao tận nơi")).toBeInTheDocument();
    expect(screen.getByText("Đến cửa hàng lấy")).toBeInTheDocument();
    expect(screen.getByText("Bánh sinh nhật")).toBeInTheDocument();
    expect(screen.getByText("Gợi ý cho bạn")).toBeInTheDocument();
    expect(screen.getAllByText("Bánh Red Velvet")).toHaveLength(2); // Appears in multiple collections
  });

  it("should add product to cart and show sticky cart", async () => {
    render(await HomePage());

    expect(screen.queryByText("Xem giỏ hàng")).not.toBeInTheDocument();

    const addButtons = screen.getAllByText("Thêm");
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Xem giỏ hàng")).toBeInTheDocument();
    });

    expect(screen.getByText("1 món")).toBeInTheDocument();
  });

  it("should navigate to search when search bar is clicked", async () => {
    render(await HomePage());

    const searchBar = screen.getByPlaceholderText(
      "Bạn muốn tìm bánh gì hôm nay?",
    );
    fireEvent.click(searchBar);

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("should update delivery mode", async () => {
    render(await HomePage());

    const pickupOption = screen.getByText("Đến cửa hàng lấy");
    fireEvent.click(pickupOption);

    await waitFor(() => {
      expect(useOrderConfigStore.getState().config.deliveryMode).toBe("pickup");
    });
  });
});
