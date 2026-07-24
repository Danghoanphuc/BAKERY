import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerDisplayShell } from "./CustomerDisplayShell";

describe("CustomerDisplayShell", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows pairing guidance when the display link is missing", () => {
    render(<CustomerDisplayShell sessionId="" displayToken="" />);
    expect(screen.getByText("Chưa ghép với quầy POS")).toBeInTheDocument();
  });

  it("shows total quantity and cash received/change from the POS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          snapshot: {
            status: "editing",
            items: [
              {
                cartItemId: "croissant",
                productId: "croissant",
                productName: "Croissant Bơ Pháp",
                imageUrl: "",
                price: 35_000,
                quantity: 2,
              },
            ],
            subtotal: 70_000,
            discountAmount: 0,
            totalAmount: 70_000,
            paymentMethod: "cash",
            cashReceived: 100_000,
            changeAmount: 30_000,
            updatedAt: new Date().toISOString(),
          },
        }),
      }),
    );

    render(
      <CustomerDisplayShell
        sessionId="counter-a"
        displayToken="read-token"
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("2 món trong đơn")).toBeInTheDocument(),
    );
    expect(screen.getByText("Khách đã đưa")).toBeInTheDocument();
    expect(screen.getByText("Tiền thừa")).toBeInTheDocument();
    expect(screen.getByText("100.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("30.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Đã kết nối quầy")).toBeInTheDocument();
  });

  it("shows one clear paid confirmation without repeating it on each item", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          snapshot: {
            status: "thank_you",
            items: [
              {
                cartItemId: "cake",
                productId: "cake",
                productName: "Bánh sinh nhật",
                imageUrl: "",
                price: 250_000,
                quantity: 1,
              },
            ],
            subtotal: 250_000,
            discountAmount: 0,
            totalAmount: 250_000,
            paymentMethod: "cash",
            cashReceived: 300_000,
            changeAmount: 50_000,
            orderNumber: "POS-001",
            loyaltyPointsEarned: 25,
            updatedAt: new Date().toISOString(),
          },
        }),
      }),
    );

    render(
      <CustomerDisplayShell sessionId="counter-a" displayToken="read-token" />,
    );

    expect(await screen.findByRole("heading", { name: "Thanh toán thành công" }))
      .toBeInTheDocument();
    expect(screen.getByText(/Sẵn sàng cho đơn tiếp theo sau \d+ giây/))
      .toBeInTheDocument();
    expect(screen.getByText("Tiền thừa 50.000 ₫")).toBeInTheDocument();
    expect(screen.getAllByText("250.000 ₫")).toHaveLength(1);
    expect(screen.getAllByText(/POS-001/)).toHaveLength(1);
    expect(document.querySelectorAll(".success-confetti")).toHaveLength(18);
    expect(document.querySelector("style")?.textContent).toContain(
      "prefers-reduced-motion: reduce",
    );
    expect(
      within(screen.getByRole("article")).queryByText("Đã thanh toán"),
    ).not.toBeInTheDocument();
  });
});
