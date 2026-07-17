import { NextResponse } from "next/server";
import type { CartItem } from "@/types";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  ADMIN_SESSION_COOKIE,
  parseAdminSessionValue,
} from "@/lib/auth/admin-session";
import { readCookie } from "@/lib/auth/customer-session";
import { getOrderById } from "@/lib/db";
import {
  attachTablePayment,
  abandonEmptyTable,
  closePaidTable,
  confirmTablePayment,
  getTableServiceSnapshot,
  getKitchenQueue,
  openTable,
  reopenPendingTablePayment,
  releaseCleanTable,
  saveTableDraft,
  sendTableRound,
  updateKitchenRoundStatus,
} from "@/lib/pos-table-service";

function getActor(request: Request) {
  const session = parseAdminSessionValue(
    readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE),
  );
  if (!session) throw new Error("UNAUTHORIZED");
  return { id: session.id, name: session.name };
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const messages: Record<string, [string, number]> = {
    TABLE_NOT_FOUND: ["Không tìm thấy bàn.", 404],
    TAB_NOT_FOUND: ["Không tìm thấy hóa đơn đang mở.", 404],
    TABLE_LOCKED: ["Bàn không ở trạng thái phù hợp.", 409],
    TAB_LOCKED: ["Hóa đơn đang thanh toán hoặc đã đóng.", 409],
    EMPTY_DRAFT: ["Chưa có món mới để gửi bếp.", 400],
    UNSENT_ITEMS: ["Còn món chưa gửi bếp. Hãy gửi món trước khi tính tiền.", 409],
    PAYMENT_REQUIRED: ["Hóa đơn chưa được thanh toán.", 409],
    TAB_NOT_EMPTY: ["Bàn đã có món nên không thể hủy nhanh.", 409],
    INVALID_PAYMENT: ["Thông tin thanh toán không khớp với hóa đơn.", 409],
    ROUND_NOT_FOUND: ["Không tìm thấy lượt món.", 404],
    INVALID_ROUND_STATUS: ["Lượt món đã được cập nhật ở thiết bị khác.", 409],
  };
  const [message, status] = messages[code] ?? ["Không thể cập nhật phục vụ bàn.", 500];
  if (status === 500) console.error("Table service failed:", error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("mode") === "kitchen") {
      return NextResponse.json({ tickets: await getKitchenQueue() }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
    const tableId = url.searchParams.get("tableId") ?? undefined;
    return NextResponse.json(await getTableServiceSnapshot(tableId), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const actor = getActor(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action;

    if (action === "open_table" && typeof body.tableId === "string") {
      return NextResponse.json({ tab: await openTable(body.tableId, actor) });
    }
    if (
      action === "save_draft" &&
      typeof body.tabId === "string" &&
      Array.isArray(body.items)
    ) {
      const tab = await saveTableDraft(body.tabId, body.items as CartItem[], {
        note: typeof body.note === "string" ? body.note : undefined,
        customerName:
          typeof body.customerName === "string" ? body.customerName : undefined,
        customerPhone:
          typeof body.customerPhone === "string" ? body.customerPhone : undefined,
      });
      return NextResponse.json({ tab });
    }
    if (action === "send_round" && typeof body.tabId === "string") {
      return NextResponse.json({
        tab: await sendTableRound(
          body.tabId,
          actor,
          typeof body.note === "string" ? body.note : undefined,
        ),
      });
    }
    if (
      action === "attach_payment" &&
      typeof body.tabId === "string" &&
      typeof body.orderId === "string" &&
      typeof body.orderNumber === "string" &&
      (body.method === "cash" || body.method === "bank_transfer") &&
      (body.status === "pending" || body.status === "paid")
    ) {
      const order = await getOrderById(body.orderId);
      if (
        !order ||
        order.orderNumber !== body.orderNumber ||
        order.paymentStatus !== body.status
      ) {
        throw new Error("INVALID_PAYMENT");
      }
      await attachTablePayment(body.tabId, {
        orderId: body.orderId,
        orderNumber: body.orderNumber,
        method: body.method,
        status: body.status,
        qrCode: typeof body.qrCode === "string" ? body.qrCode : undefined,
        checkoutUrl:
          typeof body.checkoutUrl === "string" ? body.checkoutUrl : undefined,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "confirm_payment" && typeof body.tabId === "string") {
      await confirmTablePayment(body.tabId);
      return NextResponse.json({ ok: true });
    }
    if (action === "reopen_payment" && typeof body.tabId === "string") {
      await reopenPendingTablePayment(body.tabId);
      return NextResponse.json({ ok: true });
    }
    if (action === "abandon_empty_table" && typeof body.tabId === "string") {
      await abandonEmptyTable(body.tabId);
      return NextResponse.json({ ok: true });
    }
    if (action === "close_table" && typeof body.tabId === "string") {
      await closePaidTable(body.tabId);
      return NextResponse.json({ ok: true });
    }
    if (action === "release_table" && typeof body.tableId === "string") {
      await releaseCleanTable(body.tableId);
      return NextResponse.json({ ok: true });
    }
    if (
      action === "update_round_status" &&
      typeof body.tabId === "string" &&
      typeof body.roundId === "string" &&
      (body.status === "preparing" || body.status === "ready" || body.status === "served")
    ) {
      await updateKitchenRoundStatus(body.tabId, body.roundId, body.status);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
