export const INGREDIENT_GROUPS = [
  ["BOT", "Bột"],
  ["DUONG", "Đường / chất tạo ngọt"],
  ["SUA", "Sữa"],
  ["CHATBEO", "Bơ / chất béo"],
  ["TRUNG", "Trứng"],
  ["CACAO", "Chocolate / cacao"],
  ["TRAICAY", "Trái cây"],
  ["HUONG", "Hương liệu"],
  ["PHUGIA", "Phụ gia"],
  ["BAOBI", "Bao bì"],
  ["KHAC", "Khác"],
] as const;

const validGroups = new Set<string>(INGREDIENT_GROUPS.map(([code]) => code));

export function normalizeIngredientGroup(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  return validGroups.has(normalized) ? normalized : "KHAC";
}

export function formatIngredientCode(group: string, sequence: number): string {
  return `NL-${normalizeIngredientGroup(group)}-${Math.max(1, sequence).toString().padStart(4, "0")}`;
}
