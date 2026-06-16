import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Image from "next/image";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    priority,
    loading,
    quality,
    ...props
  }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        data-width={width}
        data-height={height}
        data-priority={priority}
        data-loading={loading}
        data-quality={quality}
        {...props}
      />
    );
  },
}));

describe("Image Optimization", () => {
  it("should render images with explicit dimensions to prevent CLS", () => {
    render(
      <Image
        src="https://loremflickr.com/150/150?lock=test1"
        alt="Test product"
        width={150}
        height={150}
        loading="lazy"
        quality={85}
      />,
    );

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("data-width", "150");
    expect(image).toHaveAttribute("data-height", "150");
  });

  it("should use lazy loading for non-priority images", () => {
    render(
      <Image
        src="https://loremflickr.com/150/150?lock=test2"
        alt="Test product"
        width={150}
        height={150}
        loading="lazy"
      />,
    );

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("data-loading", "lazy");
  });

  it("should use priority loading for above-the-fold images", () => {
    render(
      <Image
        src="https://loremflickr.com/400/150?lock=test3"
        alt="Promo banner"
        width={400}
        height={150}
        priority
      />,
    );

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("data-priority", "true");
  });

  it("should specify quality for optimal performance", () => {
    render(
      <Image
        src="https://loremflickr.com/150/150?lock=test4"
        alt="Test product"
        width={150}
        height={150}
        quality={85}
      />,
    );

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("data-quality", "85");
  });
});
