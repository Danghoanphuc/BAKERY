import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

beforeAll(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

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

  it("stays inside the visual viewport when a mobile keyboard opens", async () => {
    const originalViewport = Object.getOwnPropertyDescriptor(
      window,
      "visualViewport",
    );
    const viewport = new EventTarget() as VisualViewport;
    Object.defineProperties(viewport, {
      height: { configurable: true, writable: true, value: 640 },
      offsetTop: { configurable: true, writable: true, value: 0 },
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BottomSheet isOpen onClose={() => undefined} title="PIN">
          <input inputMode="numeric" />
        </BottomSheet>,
      );
    });

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.style.height).toBe("640px");

    await act(async () => {
      Object.defineProperty(viewport, "height", {
        configurable: true,
        writable: true,
        value: 320,
      });
      Object.defineProperty(viewport, "offsetTop", {
        configurable: true,
        writable: true,
        value: 24,
      });
      viewport.dispatchEvent(new Event("resize"));
    });

    expect(dialog?.style.height).toBe("320px");
    expect(dialog?.style.top).toBe("24px");

    await act(async () => root.unmount());
    container.remove();
    if (originalViewport) {
      Object.defineProperty(window, "visualViewport", originalViewport);
    } else {
      Reflect.deleteProperty(window, "visualViewport");
    }
  });
});
