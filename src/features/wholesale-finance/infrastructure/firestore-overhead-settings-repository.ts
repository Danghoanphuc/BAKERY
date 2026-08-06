import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { ManufacturingOverheadSettings } from "@/types";
import { EMPTY_MANUFACTURING_OVERHEAD_SETTINGS } from "../domain/manufacturing-overhead";

const COLLECTION = "finance_settings";
const DOCUMENT = "manufacturing_overhead";

export async function getManufacturingOverheadSettings(): Promise<ManufacturingOverheadSettings> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .doc(DOCUMENT)
    .get();
  if (!snapshot.exists) return EMPTY_MANUFACTURING_OVERHEAD_SETTINGS;
  const data = snapshot.data() ?? {};
  return {
    utilitiesPerMonth: Number(data.utilitiesPerMonth ?? 0),
    equipmentDepreciationPerMonth: Number(
      data.equipmentDepreciationPerMonth ?? 0,
    ),
    premisesPerMonth: Number(data.premisesPerMonth ?? 0),
    maintenancePerMonth: Number(data.maintenancePerMonth ?? 0),
    otherIndirectCostsPerMonth: Number(data.otherIndirectCostsPerMonth ?? 0),
    productiveHoursPerMonth: Number(data.productiveHoursPerMonth ?? 0),
  };
}

export async function persistManufacturingOverheadSettings(
  settings: ManufacturingOverheadSettings,
) {
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(DOCUMENT)
    .set(
      {
        ...settings,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return settings;
}
