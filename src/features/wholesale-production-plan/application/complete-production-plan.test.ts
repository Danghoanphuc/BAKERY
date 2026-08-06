import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ audit: vi.fn(), getGroup: vi.fn(), persist: vi.fn() }));

vi.mock("@/features/wholesale-finance/infrastructure/firestore-finance-repository", () => ({
  financeRepository: { record: mocks.audit },
}));
vi.mock("@/features/wholesale-finance/infrastructure/firestore-operations-repository", () => ({
  persistProductionPlanCompletion: mocks.persist,
}));
vi.mock("../infrastructure/firestore-production-group-repository", () => ({
  getProductionGroupById: mocks.getGroup,
}));

import { completeProductionPlan } from "./complete-production-plan";

const group = {
  id: "sweet-dough", name: "Thau bánh mì ngọt", batchLabel: "thau",
  batchCapacity: 5_000, batchUnit: "gram" as const,
  inputLines: [
    { itemType: "ingredient" as const, itemId: "flour", quantityPerBatch: 3_000 },
    { itemType: "product" as const, itemId: "sauce", quantityPerBatch: 500 },
  ],
  outputLines: [{ productId: "round", quantityPerUnit: 60, targetQuantity: 100 }],
};

describe("completeProductionPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGroup.mockResolvedValue(group);
    mocks.persist.mockImplementation(async (input) => ({
      id: "production-plan%3Arun-1", groupId: input.group.id,
      groupName: input.group.name, batchCount: input.batchCount,
      locationId: input.locationId, outputs: input.outputs, materials: input.materials,
      totalInventoryValue: 0, occurredAt: input.occurredAt, createdBy: input.createdBy,
    }));
  });

  it("passes confirmed outputs and raw/semi-finished usage to one persistence call", async () => {
    const completion = await completeProductionPlan({
      idempotencyKey: "production-plan:run-1", groupId: group.id, batchCount: 2,
      locationId: "main",
      outputs: [{ productId: "round", plannedQuantity: 80, actualQuantity: 78 }],
      materials: [
        { itemType: "ingredient", itemId: "flour", plannedQuantity: 6_000, actualQuantity: 5_900 },
        { itemType: "product", itemId: "sauce", plannedQuantity: 1_000, actualQuantity: 980 },
      ],
      occurredAt: new Date("2026-08-06T00:00:00.000Z"), actor: "owner",
    });

    expect(completion.id).toBe("production-plan%3Arun-1");
    expect(mocks.persist).toHaveBeenCalledTimes(1);
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "production-plan:run-1", group, createdBy: "owner",
      materials: expect.arrayContaining([
        expect.objectContaining({ itemType: "product", itemId: "sauce", actualQuantity: 980 }),
      ]),
    }));
  });

  it("rejects a material that is not configured on the group", async () => {
    await expect(completeProductionPlan({
      idempotencyKey: "production-plan:run-2", groupId: group.id, batchCount: 2,
      locationId: "main",
      outputs: [{ productId: "round", plannedQuantity: 80, actualQuantity: 80 }],
      materials: [
        { itemType: "ingredient", itemId: "flour", plannedQuantity: 6_000, actualQuantity: 6_000 },
        { itemType: "ingredient", itemId: "salt", plannedQuantity: 10, actualQuantity: 10 },
      ],
      occurredAt: new Date("2026-08-06T00:00:00.000Z"), actor: "owner",
    })).rejects.toThrow("INVALID_PRODUCTION_PLAN_COMPLETION");
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});
