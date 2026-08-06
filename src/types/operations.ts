export type InventoryItemType = "ingredient" | "product";
export type IngredientPurchaseUnit =
  | "gram" | "kilogram" | "millilitre" | "litre" | "each";
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
  variantBreakdown?: Array<{
    variantId?: string;
    variantSku?: string;
    variantBarcode?: string;
    quantity: number;
  }>;
}

export interface PurchaseReceiptLine {
  ingredientId: string;
  /** Quantity normalized to the ingredient base unit. */
  quantity: number;
  lineAmount: number;
  purchaseQuantity?: number;
  purchaseUnit?: IngredientPurchaseUnit;
  /** Supplier-facing package metadata kept for audit and receipt display. */
  purchaseUnitLabel?: string;
  purchasePackQuantity?: number;
  purchasePackCount?: number;
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
  /** Omitted on legacy batches, which always consume raw-ingredient inventory. */
  componentType?: "ingredient" | "semi_finished";
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
