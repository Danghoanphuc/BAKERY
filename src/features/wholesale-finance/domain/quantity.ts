export type BaseUnit = "gram" | "millilitre" | "each";

export type Quantity = Readonly<{
  value: number;
  unit: BaseUnit;
}>;

export function quantity(value: number, unit: BaseUnit): Quantity {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("QUANTITY_MUST_BE_A_NON_NEGATIVE_SAFE_INTEGER");
  }
  return Object.freeze({ value, unit });
}

