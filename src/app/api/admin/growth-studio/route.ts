import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createAndPersistGrowthStudioWorkspace,
  listGrowthStudioProducts,
  listGrowthStudioWorkspaces,
} from "@/features/admin/growth-studio/growth-studio-repository";
import { GROWTH_WORKSPACE_TEMPLATES } from "@/features/admin/growth-studio/growth-studio-domain";
import type { GrowthWorkspaceTemplateId } from "@/features/admin/growth-studio/growth-studio-contract";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const [products, workspaces] = await Promise.all([
      listGrowthStudioProducts(),
      listGrowthStudioWorkspaces(),
    ]);
    return NextResponse.json({ products, workspaces });
  } catch (error) {
    console.error("Failed to load Growth Studio:", error);
    return NextResponse.json(
      { error: "Không thể tải Studio tăng trưởng." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json().catch(() => ({})) as { templateId?: GrowthWorkspaceTemplateId; title?: string; description?: string };
    if (body.templateId && !GROWTH_WORKSPACE_TEMPLATES.some((template) => template.id === body.templateId)) {
      return NextResponse.json({ error: "Template workspace không hợp lệ." }, { status: 400 });
    }
    const workspace = await createAndPersistGrowthStudioWorkspace(body);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("Failed to create Growth Studio workspace:", error);
    return NextResponse.json(
      { error: "Không thể tạo workspace." },
      { status: 500 },
    );
  }
}
