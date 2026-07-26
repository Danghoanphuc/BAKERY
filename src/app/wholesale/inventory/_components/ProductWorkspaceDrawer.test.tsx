import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { ProductWorkspaceDrawer } from "./ProductWorkspaceDrawer";

describe("ProductWorkspaceDrawer", () => {
  it("keeps the edited field focused when controlled form state changes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProductWorkspaceDrawer
          isOpen
          title="Bán hàng"
          onClose={() => undefined}
          header={<div>Header</div>}
        >
          <input aria-label="Tên sản phẩm" value="B" onChange={() => undefined} />
        </ProductWorkspaceDrawer>,
      );
    });

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Tên sản phẩm"]',
    );
    input?.focus();
    expect(document.activeElement).toBe(input);

    await act(async () => {
      root.render(
        <ProductWorkspaceDrawer
          isOpen
          title="Bán hàng"
          onClose={() => undefined}
          header={<div>Header mới</div>}
        >
          <input
            aria-label="Tên sản phẩm"
            value="Bánh"
            onChange={() => undefined}
          />
        </ProductWorkspaceDrawer>,
      );
    });

    expect(document.activeElement).toBe(input);

    await act(async () => root.unmount());
    container.remove();
  });

  it("uses the latest close callback without resetting the focus trap", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const firstClose = vi.fn();
    const latestClose = vi.fn();

    await act(async () => {
      root.render(
        <ProductWorkspaceDrawer
          isOpen
          title="Bán hàng"
          onClose={firstClose}
          header={<div>Header</div>}
        >
          <input aria-label="Giá bán" />
        </ProductWorkspaceDrawer>,
      );
    });

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Giá bán"]',
    );
    input?.focus();

    await act(async () => {
      root.render(
        <ProductWorkspaceDrawer
          isOpen
          title="Bán hàng"
          onClose={latestClose}
          header={<div>Header</div>}
        >
          <input aria-label="Giá bán" />
        </ProductWorkspaceDrawer>,
      );
    });

    expect(document.activeElement).toBe(input);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
    container.remove();
  });
});
