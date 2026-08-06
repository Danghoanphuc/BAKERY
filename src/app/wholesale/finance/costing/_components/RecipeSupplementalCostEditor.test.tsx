import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeSupplementalCostEditor, type SupplementalCostValues } from "./RecipeSupplementalCostEditor";

const settings = {
  utilitiesPerMonth: 6_000_000,
  equipmentDepreciationPerMonth: 4_000_000,
  premisesPerMonth: 5_000_000,
  maintenancePerMonth: 2_000_000,
  otherIndirectCostsPerMonth: 1_000_000,
  productiveHoursPerMonth: 180,
};

function Harness({ onOuterSubmit = vi.fn() }: { onOuterSubmit?: () => void }) {
  const [values, setValues] = useState<SupplementalCostValues>({
    packagingCostPerBatch: 0,
    directLaborCostPerBatch: 0,
    overheadCostPerBatch: 0,
    wastePercent: 0,
  });
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onOuterSubmit();
    }}>
      <output data-testid="overhead-value">{values.overheadCostPerBatch}</output>
      <RecipeSupplementalCostEditor
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        packagingCostLines={[]}
        onPackagingCostLinesChange={vi.fn()}
        directLaborCostLines={[]}
        onDirectLaborCostLinesChange={vi.fn()}
        onWasteCalculationChange={vi.fn()}
        batchCycleMinutes={90}
        yieldQuantity={10}
      />
    </form>
  );
}

describe("RecipeSupplementalCostEditor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("applies the saved overhead calculation to the BOM draft", async () => {
    const onOuterSubmit = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(settings), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));

    render(<Harness onOuterSubmit={onOuterSubmit} />);
    const overheadButton = screen.getByRole("button", { name: "Tính chi phí chung" });
    await waitFor(() => expect(overheadButton).toBeEnabled());
    fireEvent.click(overheadButton);
    fireEvent.click(await screen.findByRole("button", { name: "Lưu cấu hình & điền vào BOM" }));

    await waitFor(() => {
      expect(screen.getByTestId("overhead-value")).toHaveTextContent("150000");
    });
    expect(onOuterSubmit).not.toHaveBeenCalled();
  });
});
