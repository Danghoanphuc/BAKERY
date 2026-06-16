import { render, screen } from "@testing-library/react";
import { PromoBanner } from "./PromoBanner";
import { describe, it, expect, vi } from "vitest";

// Mock Next.js components
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

describe("PromoBanner", () => {
  const defaultProps = {
    title: "Khuyến mãi đặc biệt",
    description: "Giảm giá 30% cho tất cả bánh ngọt trong tuần này",
    imageUrl: "/images/promo-banner.jpg",
    href: "/promotions/special-offer",
  };

  it("renders promo banner with correct content", () => {
    render(<PromoBanner {...defaultProps} />);

    expect(screen.getByText("Khuyến mãi đặc biệt")).toBeInTheDocument();
    expect(
      screen.getByText("Giảm giá 30% cho tất cả bánh ngọt trong tuần này"),
    ).toBeInTheDocument();
  });

  it("renders image with correct alt text", () => {
    render(<PromoBanner {...defaultProps} />);

    const image = screen.getByAltText("Khuyến mãi đặc biệt");
    expect(image).toBeInTheDocument();
  });

  it("renders link with correct href", () => {
    render(<PromoBanner {...defaultProps} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/promotions/special-offer");
  });

  it("has proper accessibility attributes", () => {
    render(<PromoBanner {...defaultProps} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "aria-label",
      "Xem chi tiết khuyến mãi: Khuyến mãi đặc biệt",
    );
  });

  it("applies custom className when provided", () => {
    render(<PromoBanner {...defaultProps} className="custom-class" />);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom-class");
  });

  it("renders navigation icon", () => {
    render(<PromoBanner {...defaultProps} />);

    // Check for the SVG navigation icon
    const svg = screen.getByRole("link").querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
