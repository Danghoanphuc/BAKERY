import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "./Header";
import { useOrderConfigStore } from "@/store/orderConfigStore";

// Mock the store
vi.mock("@/store/orderConfigStore");

const mockUseOrderConfigStore = vi.mocked(useOrderConfigStore);

describe("Header", () => {
  const mockConfig = {
    deliveryMode: "delivery" as const,
    orderTiming: {
      type: "now" as const,
    },
    deliveryAddress: undefined,
  };

  beforeEach(() => {
    mockUseOrderConfigStore.mockReturnValue({
      config: mockConfig,
      setDeliveryMode: vi.fn(),
      setOrderTiming: vi.fn(),
      setDeliveryAddress: vi.fn(),
    });
  });

  it("renders timing and address sections", () => {
    render(<Header />);

    expect(screen.getByText("Giao ngay")).toBeInTheDocument();
    expect(screen.getByText("Chọn địa chỉ giao hàng")).toBeInTheDocument();
  });

  it("displays scheduled timing correctly", () => {
    mockUseOrderConfigStore.mockReturnValue({
      config: {
        ...mockConfig,
        orderTiming: {
          type: "scheduled",
          scheduledDate: "2024-12-25",
          scheduledTime: "14:30",
        },
      },
      setDeliveryMode: vi.fn(),
      setOrderTiming: vi.fn(),
      setDeliveryAddress: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("25/12, 14:30")).toBeInTheDocument();
  });

  it("displays delivery address when configured", () => {
    mockUseOrderConfigStore.mockReturnValue({
      config: {
        ...mockConfig,
        deliveryAddress: {
          street: "123 Phố Huế",
          district: "Hai Bà Trưng",
          city: "Hà Nội",
        },
      },
      setDeliveryMode: vi.fn(),
      setOrderTiming: vi.fn(),
      setDeliveryAddress: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("123 Phố Huế, Hai Bà Trưng")).toBeInTheDocument();
  });

  it("applies correct CSS classes for sticky positioning", () => {
    const { container } = render(<Header />);
    const header = container.querySelector("header");

    expect(header).toHaveClass("fixed", "top-0", "z-40", "h-14");
  });

  it("has accessible labels for interactive elements", () => {
    render(<Header />);

    expect(screen.getByLabelText(/Thời gian giao hàng/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Địa chỉ giao hàng/)).toBeInTheDocument();
  });

  it("meets minimum touch target requirements", () => {
    render(<Header />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveClass("min-h-[48px]");
    });
  });
});
