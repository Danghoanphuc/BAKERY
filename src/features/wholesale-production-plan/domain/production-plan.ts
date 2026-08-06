import type {
  ProductionGroup,
  ProductionGroupDraft,
  ProductionGroupInputLine,
  ProductionGroupOutputLine,
  ProductionPlanInventoryItemType,
  ProductionPlanSuggestion,
  ProductionPlanUnit,
} from "@/types/production-plan";

const UNITS = new Set<ProductionPlanUnit>(["gram", "millilitre", "each"]);
const ITEM_TYPES = new Set<ProductionPlanInventoryItemType>(["ingredient", "product"]);

function integer(value: unknown, minimum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error("INVALID_PRODUCTION_GROUP");
  }
  return parsed;
}

function nonEmpty(value: unknown) {
  const parsed = typeof value === "string" ? value.trim() : "";
  if (!parsed) throw new Error("INVALID_PRODUCTION_GROUP");
  return parsed;
}

function normalizeInputLine(value: unknown): ProductionGroupInputLine {
  if (!value || typeof value !== "object") {
    throw new Error("INVALID_PRODUCTION_GROUP");
  }
  const line = value as Record<string, unknown>;
  const itemType = line.itemType as ProductionPlanInventoryItemType;
  if (!ITEM_TYPES.has(itemType)) throw new Error("INVALID_PRODUCTION_GROUP");
  return {
    itemType,
    itemId: nonEmpty(line.itemId),
    quantityPerBatch: integer(line.quantityPerBatch, 1),
  };
}

function normalizeOutputLine(value: unknown): ProductionGroupOutputLine {
  if (!value || typeof value !== "object") {
    throw new Error("INVALID_PRODUCTION_GROUP");
  }
  const line = value as Record<string, unknown>;
  return {
    productId: nonEmpty(line.productId),
    quantityPerUnit: integer(line.quantityPerUnit, 1),
    targetQuantity: integer(line.targetQuantity, 0),
  };
}

export function normalizeProductionGroup(input: unknown): ProductionGroupDraft {
  if (!input || typeof input !== "object") {
    throw new Error("INVALID_PRODUCTION_GROUP");
  }
  const value = input as Record<string, unknown>;
  const batchUnit = value.batchUnit as ProductionPlanUnit;
  const inputLines = Array.isArray(value.inputLines)
    ? value.inputLines.map(normalizeInputLine)
    : [];
  const outputLines = Array.isArray(value.outputLines)
    ? value.outputLines.map(normalizeOutputLine)
    : [];
  const inputKeys = inputLines.map((line) => `${line.itemType}:${line.itemId}`);
  const outputKeys = outputLines.map((line) => line.productId);

  if (
    !UNITS.has(batchUnit) ||
    inputLines.length === 0 ||
    outputLines.length === 0 ||
    new Set(inputKeys).size !== inputKeys.length ||
    new Set(outputKeys).size !== outputKeys.length
  ) {
    throw new Error("INVALID_PRODUCTION_GROUP");
  }

  const id =
    typeof value.id === "string" && value.id.trim() ? value.id.trim() : undefined;
  return {
    ...(id ? { id } : {}),
    name: nonEmpty(value.name),
    batchLabel: nonEmpty(value.batchLabel),
    batchCapacity: integer(value.batchCapacity, 1),
    batchUnit,
    inputLines,
    outputLines,
  };
}

function safeStock(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function inventoryPlanKey(
  itemType: ProductionPlanInventoryItemType,
  itemId: string,
) {
  return `${itemType}:${itemId}`;
}

export function calculateProductionPlan(
  group: ProductionGroup,
  stockByProductId: Readonly<Record<string, number>>,
  availableByItemKey: Readonly<Record<string, number>> = {},
): ProductionPlanSuggestion {
  const outputs = group.outputLines.map((line) => {
    const currentStock = safeStock(stockByProductId[line.productId]);
    const plannedQuantity = Math.max(0, line.targetQuantity - currentStock);
    return {
      productId: line.productId,
      targetQuantity: line.targetQuantity,
      currentStock,
      plannedQuantity,
      requiredBatchOutput: plannedQuantity * line.quantityPerUnit,
    };
  });
  const totalRequiredBatchOutput = outputs.reduce(
    (total, line) => total + line.requiredBatchOutput,
    0,
  );
  const batchCount =
    totalRequiredBatchOutput > 0
      ? Math.ceil(totalRequiredBatchOutput / group.batchCapacity)
      : 0;
  const totalBatchOutput = batchCount * group.batchCapacity;

  return {
    batchCount,
    totalRequiredBatchOutput,
    totalBatchOutput,
    surplusQuantity: totalBatchOutput - totalRequiredBatchOutput,
    outputs,
    materials: group.inputLines.map((line) => {
      const requiredQuantity = line.quantityPerBatch * batchCount;
      const availableQuantity = safeStock(
        availableByItemKey[inventoryPlanKey(line.itemType, line.itemId)],
      );
      return {
        itemType: line.itemType,
        itemId: line.itemId,
        requiredQuantity,
        availableQuantity,
        shortageQuantity: Math.max(0, requiredQuantity - availableQuantity),
      };
    }),
  };
}
