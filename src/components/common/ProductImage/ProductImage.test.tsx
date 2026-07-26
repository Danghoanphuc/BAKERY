import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductImage } from "./ProductImage";

describe("ProductImage", () => {
  it("tries to render again when the image URL changes after an error", () => {
    const { rerender } = render(
      <ProductImage src="https://example.com/old.jpg" alt="Sản phẩm" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Sản phẩm" }));
    expect(screen.queryByRole("img", { name: "Sản phẩm" })).toBeNull();

    rerender(
      <ProductImage src="https://example.com/new.jpg" alt="Sản phẩm" />,
    );

    expect(screen.getByRole("img", { name: "Sản phẩm" })).toHaveAttribute(
      "src",
      "https://example.com/new.jpg",
    );
  });
});
