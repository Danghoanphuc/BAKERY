import type { ManufacturingOverheadSettings } from "@/types";
import { normalizeManufacturingOverheadSettings } from "../domain/manufacturing-overhead";
import {
  getManufacturingOverheadSettings,
  persistManufacturingOverheadSettings,
} from "../infrastructure/firestore-overhead-settings-repository";

export { getManufacturingOverheadSettings };

export async function saveManufacturingOverheadSettings(
  input: Partial<ManufacturingOverheadSettings>,
) {
  return persistManufacturingOverheadSettings(
    normalizeManufacturingOverheadSettings(input),
  );
}
