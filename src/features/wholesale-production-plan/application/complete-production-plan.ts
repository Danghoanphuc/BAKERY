import { financeRepository } from "@/features/wholesale-finance/infrastructure/firestore-finance-repository";
import { persistProductionPlanCompletion } from "@/features/wholesale-finance/infrastructure/firestore-operations-repository";
import type { ProductionPlanInventoryItemType } from "@/types/production-plan";
import { getProductionGroupById } from "../infrastructure/firestore-production-group-repository";

function positiveInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export async function completeProductionPlan(input: {
  idempotencyKey: string;
  groupId: string;
  batchCount: number;
  locationId: string;
  outputs: Array<{ productId: string; plannedQuantity: number; actualQuantity: number }>;
  materials: Array<{
    itemType: ProductionPlanInventoryItemType;
    itemId: string;
    plannedQuantity: number;
    actualQuantity: number;
  }>;
  occurredAt: Date;
  actor: string;
}) {
  const group = await getProductionGroupById(input.groupId);
  const outputIds = input.outputs.map((line) => line.productId);
  const materialKeys = input.materials.map((line) => `${line.itemType}:${line.itemId}`);
  const configuredOutputs = new Set(group?.outputLines.map((line) => line.productId));
  const configuredMaterials = new Set(
    group?.inputLines.map((line) => `${line.itemType}:${line.itemId}`),
  );
  const occurredAt = new Date(input.occurredAt);

  if (!group || !input.idempotencyKey?.trim() || input.idempotencyKey.length > 120 ||
      !input.locationId?.trim() || !positiveInteger(input.batchCount) ||
      !Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 5 * 60_000 ||
      input.outputs.length === 0 || input.materials.length === 0 ||
      new Set(outputIds).size !== outputIds.length ||
      new Set(materialKeys).size !== materialKeys.length ||
      materialKeys.length !== configuredMaterials.size ||
      outputIds.some((id) => !configuredOutputs.has(id)) ||
      outputIds.some((id) => materialKeys.includes(`product:${id}`)) ||
      materialKeys.some((key) => !configuredMaterials.has(key)) ||
      input.outputs.some((line) =>
        !line.productId || !nonNegativeInteger(line.plannedQuantity) ||
        !positiveInteger(line.actualQuantity)) ||
      input.materials.some((line) =>
        !line.itemId || !nonNegativeInteger(line.plannedQuantity) ||
        !positiveInteger(line.actualQuantity) ||
        line.plannedQuantity !==
          (group.inputLines.find((configured) =>
            configured.itemType === line.itemType && configured.itemId === line.itemId
          )?.quantityPerBatch ?? 0) * input.batchCount)) {
    throw new Error("INVALID_PRODUCTION_PLAN_COMPLETION");
  }

  const completion = await persistProductionPlanCompletion({
    ...input,
    idempotencyKey: input.idempotencyKey.trim(),
    locationId: input.locationId.trim(),
    occurredAt,
    group,
    createdBy: input.actor,
  });
  await financeRepository.record({
    action: "production_plan_completed",
    entityType: "production_batch",
    entityId: completion.id,
    actor: input.actor,
    metadata: {
      groupId: group.id,
      batchCount: completion.batchCount,
      outputCount: completion.outputs.length,
      materialCount: completion.materials.length,
    },
  });
  return completion;
}
