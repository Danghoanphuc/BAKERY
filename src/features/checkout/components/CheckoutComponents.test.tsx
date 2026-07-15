import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { CheckoutNoteField } from "./CheckoutNoteField";
import { CheckoutOrderSummary } from "./CheckoutOrderSummary";
import { CheckoutPaymentSelector } from "./CheckoutPaymentSelector";
import { CheckoutStickyBar } from "./CheckoutStickyBar";
import { CheckoutVoucherRow } from "./CheckoutVoucherRow";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("compact checkout components", () => {
  it("always exposes a voucher entry point", () => {
    const html = renderToStaticMarkup(
      <CheckoutVoucherRow
        discountAmount={0}
        isEligible
        onChoose={() => undefined}
        onClear={() => undefined}
      />,
    );

    expect(html).toContain("Chọn voucher để nhận ưu đãi");
    expect(html).toContain('aria-label="Chọn voucher"');
  });

  it("renders compact payment, order summary and sticky action", () => {
    const html = renderToStaticMarkup(
      <>
        <CheckoutPaymentSelector
          value="cod"
          isPickup={false}
          onChange={() => undefined}
        />
        <CheckoutOrderSummary
          itemCount={2}
          totalQuantity={3}
          productSubtotal={300_000}
          discountAmount={20_000}
          deliveryFee={0}
          finalTotal={280_000}
          isPickup={false}
          onViewItems={() => undefined}
        />
        <CheckoutStickyBar
          finalTotal={280_000}
          discountAmount={20_000}
          isPickup={false}
          isSubmitting={false}
        />
      </>,
    );

    expect(html).toContain("Khi nhận");
    expect(html).toContain("3 sản phẩm");
    expect(html).toContain("Đặt giao tận nơi");
  });

  it("reveals the optional note only when requested", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CheckoutNoteField
          value=""
          isPickup={false}
          onChange={() => undefined}
        />,
      );
    });

    expect(container.querySelector("textarea")).toBeNull();
    const toggle = container.querySelector("button");
    await act(async () => toggle?.click());
    expect(container.querySelector("textarea")).not.toBeNull();

    await act(async () => root.unmount());
  });
});
