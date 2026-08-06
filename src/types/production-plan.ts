export type ProductionPlanUnit = "gram" | "millilitre" | "each";
export type ProductionPlanInventoryItemType = "ingredient" | "product";

export interface ProductionGroupInputLine {
  itemType: ProductionPlanInventoryItemType;
  itemId: string;
  quantityPerBatch: number;
}

export interface ProductionGroupOutputLine {
  productId: string;
  quantityPerUnit: number;
  targetQuantity: number;
}

export interface ProductionGroup {
  id: string;
  name: string;
  batchLabel: string;
  batchCapacity: number;
  batchUnit: ProductionPlanUnit;
  inputLines: ProductionGroupInputLine[];
  outputLines: ProductionGroupOutputLine[];
  updatedAt?: string;
}

export type ProductionGroupDraft = Omit<ProductionGroup, "id" | "updatedAt"> & {
  id?: string;
};

export interface ProductionPlanOutput {
  productId: string;
  targetQuantity: number;
  currentStock: number;
  plannedQuantity: number;
  requiredBatchOutput: number;
}

export interface ProductionPlanMaterial {
  itemType: ProductionPlanInventoryItemType;
  itemId: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
}

export interface ProductionPlanSuggestion {
  batchCount: number;
  totalRequiredBatchOutput: number;
  totalBatchOutput: number;
  surplusQuantity: number;
  outputs: ProductionPlanOutput[];
  materials: ProductionPlanMaterial[];
}

export interface ProductionPlanCompletionOutput {
  productId: string;
  plannedQuantity: number;
  actualQuantity: number;
  inventoryValue?: number;
}

export interface ProductionPlanCompletionMaterial {
  itemType: ProductionPlanInventoryItemType;
  itemId: string;
  plannedQuantity: number;
  actualQuantity: number;
  inventoryValue?: number;
}

export interface ProductionPlanCompletion {
  id: string;
  groupId: string;
  groupName: string;
  batchCount: number;
  locationId: string;
  outputs: ProductionPlanCompletionOutput[];
  materials: ProductionPlanCompletionMaterial[];
  totalInventoryValue: number;
  occurredAt: Date;
  createdBy: string;
}
