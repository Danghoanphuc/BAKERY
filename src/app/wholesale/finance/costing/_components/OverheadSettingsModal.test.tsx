import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverheadSettingsModal } from "./OverheadSettingsModal";

const settings = {
  utilitiesPerMonth: 6_000_000,
  equipmentDepreciationPerMonth: 4_000_000,
  premisesPerMonth: 5_000_000,
  maintenancePerMonth: 2_000_000,
  otherIndirectCostsPerMonth: 1_000_000,
  productiveHoursPerMonth: 180,
};

describe("OverheadSettingsModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains the inputs and calculates the cost allocated to a batch", () => {
    render(
      <OverheadSettingsModal
        initialSettings={settings}
        defaultBatchMinutes={90}
        currentBatchOverhead={0}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Không nhập nguyên liệu, bao bì hoặc lương trực tiếp tại đây để tránh tính hai lần."),
    ).toBeInTheDocument();
    expect(screen.getByText("100.000 ₫")).toBeInTheDocument();
    expect(screen.getAllByText("150.000 ₫")).toHaveLength(2);
  });

  it("persists the configuration and applies the calculated batch cost", async () => {
    const onSaved = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(settings), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <OverheadSettingsModal
        initialSettings={settings}
        defaultBatchMinutes={90}
        currentBatchOverhead={10_000}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình & điền vào BOM" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(settings, 150_000);
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/wholesale/finance/overhead-settings",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
