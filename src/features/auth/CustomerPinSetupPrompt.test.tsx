import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerPinSetupPrompt } from "./CustomerPinSetupPrompt";

describe("CustomerPinSetupPrompt", () => {
  it("explains the reusable benefits without blocking the page", () => {
    const html = renderToStaticMarkup(
      <CustomerPinSetupPrompt isVisible />,
    );

    expect(html).toContain("Thiết lập PIN 4 số");
    expect(html).toContain("xem đơn");
    expect(html).toContain("voucher");
    expect(html).toContain("mọi thiết bị");
  });

  it("does not occupy UI space after PIN has been configured", () => {
    expect(
      renderToStaticMarkup(<CustomerPinSetupPrompt isVisible={false} />),
    ).toBe("");
  });
});
