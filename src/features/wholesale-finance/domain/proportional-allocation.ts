export function allocateIntegerByWeight(weights: number[], totalAmount: number) {
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0 ||
      weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) {
    throw new Error("INVALID_ALLOCATION_INPUT");
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (weights.length === 0) return [];
  if (totalWeight === 0) return weights.map(() => 0);
  const exact = weights.map((weight) => weight * totalAmount / totalWeight);
  const allocated = exact.map(Math.floor);
  const remainder = totalAmount - allocated.reduce((sum, amount) => sum + amount, 0);
  const priority = exact.map((value, index) => ({
    index, fraction: value - Math.floor(value),
  })).sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < remainder; index += 1) {
    allocated[priority[index % priority.length].index] += 1;
  }
  return allocated;
}

