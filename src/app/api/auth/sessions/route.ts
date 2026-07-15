import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  createClearCustomerSessionCookie,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import {
  listStoredCustomerSessions,
  revokeOtherStoredCustomerSessions,
  revokeStoredCustomerSession,
} from "@/lib/firebase/customer-sessions";

async function getCurrentSession(request: Request) {
  const token = readCookie(
    request.headers.get("cookie"),
    CUSTOMER_SESSION_COOKIE,
  );
  return parseCustomerSessionValue(token);
}

export async function GET(request: Request) {
  const current = await getCurrentSession(request);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const sessions = (await listStoredCustomerSessions(current.customerId))
    .filter(
      (session) => !session.revokedAt && session.expiresAt.getTime() > now,
    )
    .map((session) => ({
      id: session.id,
      deviceLabel: session.deviceLabel,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      current: session.id === current.sessionId,
    }));

  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request) {
  const current = await getCurrentSession(request);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: unknown;
  } | null;
  const sessionId =
    typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!/^[a-f0-9]{64}$/.test(sessionId)) {
    return NextResponse.json({ error: "Phiên không hợp lệ." }, { status: 400 });
  }

  const sessions = await listStoredCustomerSessions(current.customerId);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) {
    return NextResponse.json({ error: "Không tìm thấy phiên." }, { status: 404 });
  }

  await revokeStoredCustomerSession(sessionId);
  const revokedCurrent = sessionId === current.sessionId;
  const response = NextResponse.json({ ok: true, revokedCurrent });
  if (revokedCurrent) {
    response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  }
  return response;
}

export async function POST(request: Request) {
  const current = await getCurrentSession(request);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const revokedCount = await revokeOtherStoredCustomerSessions(
    current.customerId,
    current.sessionId,
  );
  return NextResponse.json({ ok: true, revokedCount });
}
