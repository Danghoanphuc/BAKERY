import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  isPosDisplaySnapshotInput,
  readPosDisplaySession,
  updatePosDisplaySession,
} from "@/lib/pos-display-session-server";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!sessionId || !token) {
    return NextResponse.json({ error: "Thiếu thông tin phiên." }, { status: 400 });
  }

  try {
    const session = await readPosDisplaySession(sessionId, token);
    if (!session) {
      return NextResponse.json(
        { error: "Phiên màn hình không hợp lệ hoặc đã hết hạn." },
        { status: 404 },
      );
    }
    return NextResponse.json(session, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Read POS display session failed:", error);
    return NextResponse.json(
      { error: "Không thể đọc màn hình khách." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { sessionId } = await params;
  const payload = (await request.json()) as { snapshot?: unknown };
  if (!sessionId || !isPosDisplaySnapshotInput(payload.snapshot)) {
    return NextResponse.json({ error: "Dữ liệu màn hình không hợp lệ." }, { status: 400 });
  }

  try {
    const snapshot = await updatePosDisplaySession(sessionId, payload.snapshot);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Phiên màn hình không tồn tại hoặc đã hết hạn." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Update POS display session failed:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật màn hình khách." },
      { status: 500 },
    );
  }
}
