import type { ProductionGroupDraft } from "@/types/production-plan";
import { normalizeProductionGroup } from "../domain/production-plan";
import {
  listProductionGroups,
  persistProductionGroup,
} from "../infrastructure/firestore-production-group-repository";

export { listProductionGroups };

export async function saveProductionGroup(input: unknown) {
  return persistProductionGroup(
    normalizeProductionGroup(input) as ProductionGroupDraft,
  );
}
