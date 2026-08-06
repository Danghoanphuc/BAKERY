import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SalesRoutesPage from "./page";

const context = {
  principal: {
    id: "owner-1",
    name: "Chủ tiệm",
    email: "owner@example.com",
    role: "owner",
    permissions: [],
  },
  businessDate: "2026-08-02",
  templates: [
    {
      id: "route-1",
      name: "Quận 7 buổi sáng",
      scheduleDays: [2, 4, 6],
      assignedRepId: "sales-1",
      assignedRepName: "Minh",
      stops: [{ dealerId: "dealer-1", sequence: 1 }],
      isActive: true,
    },
  ],
  runs: [
    {
      id: "run-1",
      templateId: "route-1",
      templateName: "Quận 7 buổi sáng",
      businessDate: "2026-08-02",
      assignedRepId: "sales-1",
      assignedRepName: "Minh",
      status: "in_progress",
      totalStops: 4,
      completedStops: 2,
      skippedStops: 1,
      orderedStops: 1,
    },
  ],
  dealers: [
    {
      id: "dealer-1",
      name: "Đại lý An",
      phone: "0900000001",
      district: "Quận 7",
      city: "TP.HCM",
    },
    {
      id: "dealer-2",
      name: "Đại lý Bình",
      phone: "0900000002",
      district: "Nhà Bè",
      city: "TP.HCM",
    },
  ],
  products: [],
  staff: [{ id: "sales-1", name: "Minh", role: "sales" }],
};

describe("SalesRoutesPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(context)),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts today's trips before template creation and exposes compact progress", async () => {
    render(<SalesRoutesPage />);

    expect(
      await screen.findByRole("heading", { name: "Kế hoạch đi tuyến" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chuyến trong ngày" })).toBeInTheDocument();
    expect(await screen.findByText("Quận 7 buổi sáng")).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mở chuyến/ })).toHaveAttribute(
      "href",
      "/wholesale/routes/today?run=run-1",
    );
  });

  it("lets a manager make the visit order explicit before saving", async () => {
    render(<SalesRoutesPage />);
    await screen.findByRole("heading", { name: "Chuyến trong ngày" });

    fireEvent.click(screen.getByRole("button", { name: "Tạo tuyến mẫu" }));
    const dialog = screen.getByRole("dialog", { name: "Tạo tuyến mẫu" });

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Đại lý An/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Đại lý Bình/ }));

    const orderedStops = within(dialog).getByRole("region", { name: "Thứ tự ghé" });
    expect(within(orderedStops).getAllByRole("listitem")[0]).toHaveTextContent("Đại lý An");

    fireEvent.click(
      within(orderedStops).getByRole("button", { name: "Đưa Đại lý Bình lên trước" }),
    );
    expect(within(orderedStops).getAllByRole("listitem")[0]).toHaveTextContent("Đại lý Bình");
  });
});
