import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomSheet } from "./BottomSheet";

describe("BottomSheet server rendering", () => {
  it("does not access the browser document during server rendering", () => {
    expect(() =>
      renderToString(
        <BottomSheet isOpen onClose={() => undefined} title="Sản phẩm">
          Nội dung sản phẩm
        </BottomSheet>,
      ),
    ).not.toThrow();
  });

  it("mounts the interactive sheet into the document portal", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BottomSheet isOpen onClose={() => undefined} title="Sản phẩm">
          Nội dung sản phẩm
        </BottomSheet>,
      );
    });

    expect(document.body.textContent).toContain("Nội dung sản phẩm");

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps input focus when parent props change while the sheet stays open", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BottomSheet isOpen onClose={() => undefined} title="Người nhận">
          <input aria-label="Họ tên" value="A" onChange={() => undefined} />
        </BottomSheet>,
      );
    });

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Họ tên"]',
    );
    input?.focus();
    expect(document.activeElement).toBe(input);

    await act(async () => {
      root.render(
        <BottomSheet isOpen onClose={() => undefined} title="Người nhận">
          <input aria-label="Họ tên" value="An" onChange={() => undefined} />
        </BottomSheet>,
      );
    });

    expect(document.activeElement).toBe(input);

    await act(async () => root.unmount());
    container.remove();
  });
});
