import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProductCard } from "./ProductCard";
import { Product } from "@/types/product";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, onLoad, onError, ...props }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        {...props}
        onLoad={() => {
          if (onLoad) onLoad();
        }}
        onError={() => {
          if (onError) onError();
        }}
      />
    );
  },
}));

const mockProduct: Product = {
  id: "1",
  name: "Bánh mì hamburger thơm ngon",
  price: 25000,
  imageUrl: "/images/burger-bread.jpg",
  categoryId: "cat-1",
  description: "Bánh mì hamburger thơm ngon",
};

describe("ProductCard", () => {
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
  });

  it("displays product name correctly", () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByText("Bánh mì hamburger thơm ngon")).toBeInTheDocument();
  });

  it("displays product price in VND format", () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByText("25.000 ₫")).toBeInTheDocument();
  });

  it("displays product image with correct attributes", () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const image = screen.getByAltText("Bánh mì hamburger thơm ngon");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/burger-bread.jpg");
  });

  it("shows loading spinner initially", () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("hides loading spinner after image loads", async () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    // Trigger image load event
    const image = screen.getByAltText("Bánh mì hamburger thơm ngon");
    fireEvent.load(image);

    await waitFor(() => {
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).not.toBeInTheDocument();
    });
  });

  it("shows fallback icon when image fails to load", async () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    // Trigger image error event
    const image = screen.getByAltText("Bánh mì hamburger thơm ngon");
    fireEvent.error(image);

    await waitFor(() => {
      const fallbackIcon = document.querySelector("svg");
      expect(fallbackIcon).toBeInTheDocument();
    });
  });

  it('calls onAddToCart when "Thêm" button is clicked', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const addButton = screen.getByText("Thêm");
    fireEvent.click(addButton);

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('has minimum touch target size for "Thêm" button', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const addButton = screen.getByText("Thêm");
    expect(addButton).toHaveClass("touch-target");
    expect(addButton).toHaveClass("min-w-[48px]");
  });

  it("handles long product names with proper line clamping", () => {
    const longNameProduct: Product = {
      ...mockProduct,
      name: "Bánh mì hamburger thơm ngon với thịt bò nướng và rau xanh tươi mát, kèm theo sốt mayonnaise đặc biệt",
    };

    const { container } = render(
      <ProductCard product={longNameProduct} onAddToCart={mockOnAddToCart} />,
    );

    const productName = container.querySelector("h3");
    expect(productName).toHaveStyle({
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
    });
  });

  it("formats different price values correctly", () => {
    const expensiveProduct: Product = {
      ...mockProduct,
      price: 1500000, // 1,500,000 VND
    };

    render(
      <ProductCard product={expensiveProduct} onAddToCart={mockOnAddToCart} />,
    );

    expect(screen.getByText("1.500.000 ₫")).toBeInTheDocument();
  });

  it("has proper test id for add to cart button", () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByTestId("add-to-cart-btn")).toBeInTheDocument();
  });

  it("maintains fixed width for consistent grid layout", () => {
    const { container } = render(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("w-40"); // 160px fixed width
  });
});
