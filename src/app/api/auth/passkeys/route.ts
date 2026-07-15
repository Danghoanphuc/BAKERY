import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import {
  deleteCustomerPasskey,
  listCustomerPasskeys,
} from "@/lib/firebase/customer-passkeys";

async function getSession(request: Request) {
  return parseCustomerSessionValue(
    readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE),
  );
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const passkeys = await listCustomerPasskeys(session.customerId);
  return NextResponse.json({
    passkeys: passkeys.map((passkey) => ({
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
      createdAt: passkey.createdAt.toISOString(),
      lastUsedAt: passkey.lastUsedAt?.toISOString(),
    })),
  });
}

export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[a-f0-9]{64}$/.test(id)) {
    return NextResponse.json({ error: "Passkey không hợp lệ." }, { status: 400 });
  }
  const deleted = await deleteCustomerPasskey(session.customerId, id);
  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Không tìm thấy passkey." }, { status: 404 });
}
