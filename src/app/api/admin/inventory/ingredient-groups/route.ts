import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  createIngredientGroup,
  listIngredientGroups,
} from "@/lib/ingredient-groups";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(
      await listIngredientGroups(getAdminFirestore()),
    );
  } catch (error) {
    console.error("Failed to list ingredient groups:", error);
    return NextResponse.json(
      { error: "Không thể tải danh mục nhóm nguyên liệu." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const group = await createIngredientGroup(
      getAdminFirestore(),
      await request.json(),
    );
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return ingredientGroupError(error);
  }
}

function ingredientGroupError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    INGREDIENT_GROUP_NAME_REQUIRED: "Vui lòng nhập tên nhóm.",
    INGREDIENT_GROUP_CODE_REQUIRED: "Không thể tạo mã nhóm.",
    INGREDIENT_GROUP_INVALID_PARENT: "Nhóm cha không hợp lệ.",
    INGREDIENT_GROUP_DUPLICATE: "Tên hoặc mã nhóm đã tồn tại.",
  };
  const message = messages[code];
  if (message) return NextResponse.json({ error: message }, { status: 400 });
  console.error("Failed to create ingredient group:", error);
  return NextResponse.json(
    { error: "Không thể tạo nhóm nguyên liệu." },
    { status: 500 },
  );
}
