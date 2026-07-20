import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { GrowthStudioWorkspace } from "@/features/admin/growth-studio/growth-studio-contract";
import { executeGrowthStudioNode } from "@/features/admin/growth-studio/growth-studio-ai-service";
import { GROWTH_NODE_DEFINITIONS } from "@/features/admin/growth-studio/growth-studio-template";
import { buildGrowthNodeRun } from "@/features/admin/growth-studio/growth-studio-node-run-service";
import { normalizeGrowthWorkspace, validateGrowthWorkspaceContext } from "@/features/admin/growth-studio/growth-studio-domain";
import {
  completeGrowthStudioRun,
  failGrowthStudioRun,
  getGrowthStudioProduct,
  saveGrowthStudioWorkspace,
  startGrowthStudioRun,
} from "@/features/admin/growth-studio/growth-studio-repository";

export const runtime = "nodejs";

function isExecutableRequest(value: unknown): value is {
  workspace: GrowthStudioWorkspace;
  nodeId: string;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { workspace?: Partial<GrowthStudioWorkspace>; nodeId?: unknown };
  const nodes = candidate.workspace?.nodes;
  const edges = candidate.workspace?.edges;
  return (
    typeof candidate.nodeId === "string" &&
    candidate.nodeId.length <= 80 &&
    typeof candidate.workspace?.id === "string" &&
    Array.isArray(nodes) &&
    nodes.length > 0 &&
    nodes.length <= 12 &&
    nodes.every((node) => (
      Boolean(GROWTH_NODE_DEFINITIONS[node.type]) &&
      (!node.artifact || (node.artifact.summary.length <= 300 && node.artifact.content.length <= 8_000))
    )) &&
    Array.isArray(edges) &&
    edges.length <= 20
  );
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body: unknown = await request.json();
    if (!isExecutableRequest(body)) {
      return NextResponse.json({ error: "Yêu cầu chạy node không hợp lệ." }, { status: 400 });
    }
    const workspace = normalizeGrowthWorkspace(body.workspace);
    const node = workspace.nodes.find((candidate) => candidate.id === body.nodeId);
    if (!node) return NextResponse.json({ error: "Không tìm thấy node." }, { status: 404 });
    const definition = GROWTH_NODE_DEFINITIONS[node.type];
    const dependenciesApproved = definition.dependsOn.every(
      (type) => workspace.nodes.find((candidate) => candidate.type === type)?.status === "approved",
    );
    if (!dependenciesApproved) {
      return NextResponse.json(
        { error: "Hãy duyệt các node đầu vào trước khi chạy bước này." },
        { status: 409 },
      );
    }
    const contextCheck = validateGrowthWorkspaceContext(workspace);
    if (!contextCheck.valid) return NextResponse.json({ error: contextCheck.errors.join(" ") }, { status: 409 });
    if (workspace.context?.productId) {
      const product = await getGrowthStudioProduct(workspace.context.productId);
      if (!product || workspace.product?.id !== product.id) {
        return NextResponse.json({ error: "Context sản phẩm không còn hợp lệ. Hãy chọn lại sản phẩm tại node Sản phẩm." }, { status: 409 });
      }
      workspace.product = product;
    }
    const canonical = await saveGrowthStudioWorkspace(workspace, "autosave");
    const run = buildGrowthNodeRun(canonical, body.nodeId);
    await startGrowthStudioRun(run);
    try {
      const artifact = await executeGrowthStudioNode({ workspace: canonical, nodeId: body.nodeId });
      const completed = await completeGrowthStudioRun(run, artifact);
      return NextResponse.json({ artifact, run: { ...run, status: "completed", outputRevisionId: completed.outputRevisionId }, workspace: completed.workspace });
    } catch (error) {
      await failGrowthStudioRun(run, error instanceof Error ? error.message : "AI execution failed");
      throw error;
    }
  } catch (error) {
    console.error("Growth Studio node execution failed:", error);
    const message = error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED"
      ? "OpenAI chưa được cấu hình trên server."
      : "AI chưa xử lý được node này. Hãy thử lại.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
