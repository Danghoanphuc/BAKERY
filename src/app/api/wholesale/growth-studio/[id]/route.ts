import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { GrowthStudioWorkspace } from "@/features/wholesale-admin/growth-studio/growth-studio-contract";
import { saveGrowthStudioWorkspace } from "@/features/wholesale-admin/growth-studio/growth-studio-repository";
import { GROWTH_WORKSPACE_TEMPLATES } from "@/features/wholesale-admin/growth-studio/growth-studio-domain";

export const runtime = "nodejs";

function isWorkspace(value: unknown): value is GrowthStudioWorkspace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GrowthStudioWorkspace>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length <= 80 &&
    typeof candidate.title === "string" &&
    candidate.title.length <= 180 &&
    GROWTH_WORKSPACE_TEMPLATES.some((template) => template.id === candidate.templateId) &&
    Array.isArray(candidate.nodes) &&
    candidate.nodes.length > 0 &&
    candidate.nodes.length <= 12 &&
    candidate.nodes.every((node) => (
      typeof node.id === "string" &&
      node.id.length <= 80 &&
      Number.isFinite(node.position?.x) &&
      Number.isFinite(node.position?.y) &&
      (!node.artifact || (node.artifact.summary.length <= 300 && node.artifact.content.length <= 8_000))
    )) &&
    Array.isArray(candidate.edges) &&
    candidate.edges.length <= 20
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { workspace?: unknown };
    if (!isWorkspace(body.workspace) || body.workspace.id !== id) {
      return NextResponse.json({ error: "Workspace không hợp lệ." }, { status: 400 });
    }
    const workspace = await saveGrowthStudioWorkspace(body.workspace);
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Failed to save Growth Studio workspace:", error);
    return NextResponse.json(
      { error: "Chưa lưu được thay đổi trong workspace." },
      { status: 500 },
    );
  }
}
