import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  deleteIngredientGroup,
  updateIngredientGroup,
} from "@/lib/ingredient-groups";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    return NextResponse.json(
      await updateIngredientGroup(
        getAdminFirestore(),
        id,
        await request.json(),
      ),
    );
  } catch (error) {
    return ingredientGroupError(error, "update");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    await deleteIngredientGroup(getAdminFirestore(), id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return ingredientGroupError(error, "delete");
  }
}

function ingredientGroupError(
  error: unknown,
  action: "update" | "delete",
) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, [string, number]> = {
    INGREDIENT_GROUP_NOT_FOUND: ["Không tìm thấy nhóm nguyên liệu.", 404],
    INGREDIENT_GROUP_NAME_REQUIRED: ["Vui lòng nhập tên nhóm.", 400],
    INGREDIENT_GROUP_CODE_REQUIRED: ["Không thể tạo mã nhóm.", 400],
    INGREDIENT_GROUP_INVALID_PARENT: ["Nhóm cha không hợp lệ.", 400],
    INGREDIENT_GROUP_DUPLICATE: ["Tên hoặc mã nhóm đã tồn tại.", 400],
    INGREDIENT_GROUP_HAS_CHILDREN: [
      "Hãy chuyển hoặc xóa các nhóm con trước.",
      409,
    ],
    INGREDIENT_GROUP_IN_USE: [
      "Nhóm đang được nguyên liệu sử dụng. Hãy ngừng hoạt động thay vì xóa.",
      409,
    ],
  };
  const known = messages[code];
  if (known) {
    return NextResponse.json({ error: known[0] }, { status: known[1] });
  }
  console.error(`Failed to ${action} ingredient group:`, error);
  return NextResponse.json(
    {
      error:
        action === "delete"
          ? "Không thể xóa nhóm nguyên liệu."
          : "Không thể cập nhật nhóm nguyên liệu.",
    },
    { status: 500 },
  );
}
