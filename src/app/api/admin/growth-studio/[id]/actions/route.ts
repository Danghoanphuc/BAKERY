import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createGrowthStudioCheckpoint,
  createGrowthStudioRelease,
  restoreGrowthStudioRevision,
  setGrowthStudioWorkspaceArchived,
  updateGrowthStudioWorkspaceMetadata,
} from "@/features/admin/growth-studio/growth-studio-repository";

export const runtime = "nodejs";

type ActionBody =
  | { action: "checkpoint"; name?: string }
  | { action: "restore"; revisionId?: string }
  | { action: "release" }
  | { action: "update_metadata"; title?: string; description?: string }
  | { action: "archive" }
  | { action: "unarchive" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const body = await request.json() as ActionBody;
    if (body.action === "checkpoint") {
      return NextResponse.json({ checkpoint: await createGrowthStudioCheckpoint(id, body.name || "Checkpoint mới") }, { status: 201 });
    }
    if (body.action === "restore" && body.revisionId) {
      return NextResponse.json({ workspace: await restoreGrowthStudioRevision(id, body.revisionId) });
    }
    if (body.action === "release") {
      return NextResponse.json({ release: await createGrowthStudioRelease(id) }, { status: 201 });
    }
    if (body.action === "update_metadata" && typeof body.title === "string") {
      return NextResponse.json({ workspace: await updateGrowthStudioWorkspaceMetadata(id, { title: body.title, description: body.description }) });
    }
    if (body.action === "archive" || body.action === "unarchive") {
      return NextResponse.json({ workspace: await setGrowthStudioWorkspaceArchived(id, body.action === "archive") });
    }
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Growth Studio action failed:", error);
    const raw = error instanceof Error ? error.message : "";
    const message = raw === "GROWTH_WORKSPACE_TITLE_REQUIRED"
      ? "Tên workspace không được để trống."
      : raw.startsWith("GROWTH_RELEASE_BLOCKED:")
      ? raw.replace("GROWTH_RELEASE_BLOCKED:", "Không thể tạo release: ").split("|").join(" ")
      : "Không thể hoàn tất hành động này.";
    return NextResponse.json({ error: message }, { status: raw.startsWith("GROWTH_RELEASE_BLOCKED:") ? 409 : 500 });
  }
}
