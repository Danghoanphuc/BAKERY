export type InventoryItemType = "ingredient" | "product";
export type InventoryMovementType =
  | "purchase_receipt" | "production_issue" | "production_output"
  | "sale" | "waste" | "adjustment";

export interface InventoryBalance {
  itemType: InventoryItemType;
  itemId: string;
  locationId: string;
  quantity: number;
  inventoryValue: number;
  updatedAt?: Date;
}

export interface InventoryMovement {
  id: string;
  itemType: InventoryItemType;
  itemId: string;
  locationId: string;
  type: InventoryMovementType;
  direction: "in" | "out";
  quantity: number;
  inventoryValue: number;
  referenceType: "purchase" | "production_batch" | "order" | "waste" | "adjustment";
  referenceId: string;
  idempotencyKey: string;
  occurredAt: Date;
  createdBy: string;
}

export interface PurchaseReceiptLine {
  ingredientId: string;
  quantity: number;
  lineAmount: number;
}

export interface PurchaseReceipt {
  id: string;
  supplierId?: string;
  documentNumber?: string;
  locationId: string;
  lines: PurchaseReceiptLine[];
  totalAmount: number;
  occurredAt: Date;
  createdBy: string;
}

export interface ProductionIngredientUsage {
  ingredientId: string;
  actualQuantity: number;
  actualCost?: number;
}

export interface ProductionBatch {
  id: string;
  productId: string;
  recipeVersionId: string;
  locationId: string;
  plannedQuantity: number;
  actualGoodQuantity: number;
  damagedQuantity: number;
  ingredientUsages: ProductionIngredientUsage[];
  directLaborCost: number;
  overheadCost: number;
  packagingCost: number;
  totalActualCost: number;
  actualUnitCost: number;
  status: "completed";
  occurredAt: Date;
  createdBy: string;
}

export type WasteReason =
  | "expired" | "production_defect" | "damaged" | "overproduction"
  | "cancelled_order" | "stocktake_variance" | "internal_use" | "sample";
