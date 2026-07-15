import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CheckoutPage from "./page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  clearCart: vi.fn(),
  clearVoucher: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    back: mocks.back,
    replace: mocks.replace,
  }),
}));

vi.mock("@/store/cartStore", () => ({
  useCartStore: () => ({
    items: [
      {
        cartItemId: "cake|default",
        productId: "cake",
        productName: "Bánh sinh nhật",
        quantity: 2,
        price: 150_000,
        imageUrl: "/cake.jpg",
      },
    ],
    totalPrice: 300_000,
    totalQuantity: 2,
    clearCart: mocks.clearCart,
  }),
}));

vi.mock("@/store/orderConfigStore", () => {
  const state = {
    config: {
      deliveryMode: "pickup" as const,
      orderTiming: { type: "now" as const },
      deliveryAddress: undefined,
    },
    setDeliveryAddress: vi.fn(),
  };
  return {
    useOrderConfigStore: Object.assign(() => state, {
      getState: () => state,
    }),
  };
});

vi.mock("@/store/voucherStore", () => ({
  useVoucherStore: () => ({
    selectedVoucher: undefined,
    clearSelectedVoucher: mocks.clearVoucher,
  }),
}));

vi.mock("@/features/vouchers", () => ({
  CustomerVoucherPicker: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="voucher-picker">Voucher picker</div> : null,
}));

vi.mock("@/components/layout/Header/AddressModal", () => ({
  AddressModal: () => null,
}));

describe("CheckoutPage compact flow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps voucher, order summary and submit action immediately available", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CheckoutPage />);
    });

    expect(container.textContent).toContain("Chọn voucher để nhận ưu đãi");
    expect(container.textContent).toContain("2 sản phẩm");
    expect(container.textContent).toContain("Xác nhận đến lấy");
    expect(container.querySelector("button[type='submit']")).not.toBeNull();

    const voucherButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Chọn voucher"),
    );
    await act(async () => voucherButton?.click());
    expect(
      container.querySelector("[data-testid='voucher-picker']"),
    ).not.toBeNull();

    await act(async () => root.unmount());
  });
});
