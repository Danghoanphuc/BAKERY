import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listGrowthStudioHistory } from "@/features/wholesale-admin/growth-studio/growth-studio-repository";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    return NextResponse.json({ history: await listGrowthStudioHistory(id) });
  } catch (error) {
    console.error("Failed to load Growth Studio history:", error);
    return NextResponse.json({ error: "Không thể tải lịch sử workspace." }, { status: 500 });
  }
}
