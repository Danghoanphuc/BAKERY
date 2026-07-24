export type Currency = "VND";

export type Money = Readonly<{
  amount: number;
  currency: Currency;
}>;

export function vnd(amount: number): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new Error("MONEY_AMOUNT_MUST_BE_A_SAFE_INTEGER");
  }
  return Object.freeze({ amount, currency: "VND" });
}

export function nonNegativeVnd(amount: number): Money {
  const money = vnd(amount);
  if (money.amount < 0) throw new Error("MONEY_AMOUNT_MUST_BE_NON_NEGATIVE");
  return money;
}

