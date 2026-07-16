import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProductCollection } from "./ProductCollection";
import { Product } from "@/types/product";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Bánh mì hamburger",
    price: 25000,
    imageUrl: "/images/burger-bread.jpg",
    categoryId: "cat-1",
    description: "Bánh mì hamburger thơm ngon",
  },
  {
    id: "2",
    name: "Bánh croissant bơ",
    price: 15000,
    imageUrl: "/images/croissant.jpg",
    categoryId: "cat-2",
    description: "Bánh croissant bơ Pháp",
  },
  {
    id: "3",
    name: "Bánh sinh nhật chocolate",
    price: 350000,
    imageUrl: "/images/chocolate-cake.jpg",
    categoryId: "cat-3",
    description: "Bánh sinh nhật chocolate đặc biệt",
  },
];

describe("ProductCollection", () => {
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
  });

  it("displays section title correctly", () => {
    render(
      <ProductCollection
        title="Gợi ý cho bạn"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    expect(screen.getByText("Gợi ý cho bạn")).toBeInTheDocument();
  });

  it("renders every product once in the responsive grid", () => {
    render(
      <ProductCollection
        title="Mới ra lò sáng nay"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    // Check that all products are rendered
    expect(screen.getByText("Bánh mì hamburger")).toBeInTheDocument();
    expect(screen.getByText("Bánh croissant bơ")).toBeInTheDocument();
    expect(screen.getByText("Bánh sinh nhật chocolate")).toBeInTheDocument();
  });

  it("displays products with correct prices in VND format", () => {
    render(
      <ProductCollection
        title="Bán chạy nhất"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    // Check Vietnamese currency formatting
    expect(screen.getByText("25.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("15.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("350.000 ₫")).toBeInTheDocument();
  });

  it('calls onAddToCart when "Thêm" button is clicked', () => {
    render(
      <ProductCollection
        title="Test Collection"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    // Click first "Thêm" button
    const addButtons = screen.getAllByText("Thêm");
    fireEvent.click(addButtons[0]);

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProducts[0]);
  });

  it("uses a two-column mobile and four-column desktop grid", () => {
    const { container } = render(
      <ProductCollection
        title="Test Collection"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    const grid = container.querySelector(".grid-cols-2");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("lg:grid-cols-4");
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <ProductCollection
        title="Test Collection"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        className="custom-class"
      />,
    );

    const section = container.querySelector("section");
    expect(section).toHaveClass("custom-class");
  });

  it("handles empty products array gracefully", () => {
    render(
      <ProductCollection
        title="Empty Collection"
        products={[]}
        onAddToCart={mockOnAddToCart}
      />,
    );

    expect(screen.getByText("Empty Collection")).toBeInTheDocument();
    expect(screen.queryByText("Thêm")).not.toBeInTheDocument();
  });

  it("has proper test ids for integration testing", () => {
    render(
      <ProductCollection
        title="Test Collection"
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
      />,
    );

    expect(screen.getByTestId("product-collection")).toBeInTheDocument();
  });
});
