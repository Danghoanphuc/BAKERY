import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type {
  ProductionGroup,
  ProductionGroupDraft,
  ProductionPlanInventoryItemType,
  ProductionPlanUnit,
} from "@/types/production-plan";

const COLLECTION = "production_plan_groups";

function groupFromData(
  id: string,
  data: FirebaseFirestore.DocumentData,
): ProductionGroup {
  return {
    id,
    name: String(data.name ?? ""),
    batchLabel: String(data.batchLabel ?? "mẻ"),
    batchCapacity: Number(data.batchCapacity ?? 0),
    batchUnit: String(data.batchUnit ?? "gram") as ProductionPlanUnit,
    inputLines: Array.isArray(data.inputLines)
      ? data.inputLines.map((line: Record<string, unknown>) => ({
          itemType: String(line.itemType ?? "ingredient") as ProductionPlanInventoryItemType,
          itemId: String(line.itemId ?? ""),
          quantityPerBatch: Number(line.quantityPerBatch ?? 0),
        }))
      : [],
    outputLines: Array.isArray(data.outputLines)
      ? data.outputLines.map((line: Record<string, unknown>) => ({
          productId: String(line.productId ?? ""),
          quantityPerUnit: Number(line.quantityPerUnit ?? 0),
          targetQuantity: Number(line.targetQuantity ?? 0),
        }))
      : [],
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function listProductionGroups(): Promise<ProductionGroup[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();
  return snapshot.docs
    .map((document) => groupFromData(document.id, document.data()))
    .sort((left, right) => left.name.localeCompare(right.name, "vi"));
}

export async function getProductionGroupById(id: string): Promise<ProductionGroup | null> {
  const document = await getAdminFirestore().collection(COLLECTION).doc(id).get();
  return document.exists ? groupFromData(document.id, document.data() ?? {}) : null;
}

export async function persistProductionGroup(
  input: ProductionGroupDraft,
): Promise<ProductionGroup> {
  const collection = getAdminFirestore().collection(COLLECTION);
  const reference = input.id ? collection.doc(input.id) : collection.doc();
  const updatedAt = new Date().toISOString();
  const { id: _id, ...data } = input;
  await reference.set({ ...data, updatedAt });
  return { ...data, id: reference.id, updatedAt };
}
