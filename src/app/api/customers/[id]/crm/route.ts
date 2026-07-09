import { NextResponse } from "next/server";

import { getCustomerById, getMarketingCampaigns, updateCustomer } from "@/lib/firebase";
import type {
  CustomerCareLog,
  CustomerCareLogOutcome,
  CustomerInput,
  CustomerRiskLevel,
  CustomerVoucherIssue,
} from "@/types";

type CrmAction =
  | "update_profile"
  | "add_note"
  | "log_call"
  | "verify_phone"
  | "set_risk"
  | "adjust_points"
  | "issue_voucher";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function createLog(input: Omit<CustomerCareLog, "id" | "createdAt">): CustomerCareLog {
  return {
    id: createId(),
    createdAt: new Date(),
    ...input,
  };
}

function appendLog(logs: CustomerCareLog[], log: CustomerCareLog) {
  return [log, ...logs].slice(0, 100);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as CrmAction | undefined;
    const actor = normalizeOptionalText(body.actor) ?? "Admin";
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 });
    }

    const careLogs = customer.careLogs ?? [];

    if (action === "update_profile") {
      const preferredChannel =
        body.preferredChannel === "phone" ||
        body.preferredChannel === "zalo" ||
        body.preferredChannel === "sms" ||
        body.preferredChannel === "email"
          ? body.preferredChannel
          : undefined;

      const payload: Partial<CustomerInput> = {
        name: normalizeOptionalText(body.name) ?? customer.name,
        email: normalizeOptionalText(body.email),
        birthday: normalizeOptionalText(body.birthday),
        tags: normalizeTags(body.tags),
        internalNotes: typeof body.internalNotes === "string" ? body.internalNotes : "",
        preferredChannel,
        personalization: {
          ...customer.personalization,
          dietaryNotes: normalizeOptionalText(body.dietaryNotes),
          defaultDeliveryAddress: normalizeOptionalText(body.defaultDeliveryAddress),
          specialOccasions: normalizeOptionalText(body.specialOccasions),
          notes: normalizeOptionalText(body.personalizationNotes),
        },
      };

      await updateCustomer(id, payload);
      return NextResponse.json({ ok: true });
    }

    if (action === "add_note") {
      const note = normalizeOptionalText(body.note);

      if (!note) {
        return NextResponse.json({ error: "Vui lòng nhập ghi chú" }, { status: 400 });
      }

      await updateCustomer(id, {
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "note",
            title: "Ghi chú chăm sóc",
            note,
            outcome: "note",
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "log_call") {
      const note = normalizeOptionalText(body.note);
      const outcome =
        body.outcome === "confirmed" ||
        body.outcome === "no_answer" ||
        body.outcome === "wrong_number" ||
        body.outcome === "callback"
          ? (body.outcome as CustomerCareLogOutcome)
          : "note";

      await updateCustomer(id, {
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "call",
            title: "Cuộc gọi chăm sóc",
            note,
            outcome,
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "verify_phone") {
      const note =
        normalizeOptionalText(body.note) ??
        "Nhân viên đã gọi xác nhận số điện thoại với khách.";

      await updateCustomer(id, {
        status: "active",
        phoneVerifiedAt: new Date(),
        phoneVerificationMethod: "admin",
        phoneVerificationNote: note,
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "phone_verified",
            title: "Đã gọi xác nhận số",
            note,
            outcome: "confirmed",
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "set_risk") {
      const riskLevel =
        body.riskLevel === "green" ||
        body.riskLevel === "yellow" ||
        body.riskLevel === "red"
          ? (body.riskLevel as CustomerRiskLevel)
          : undefined;

      if (!riskLevel) {
        return NextResponse.json({ error: "Vui lòng chọn mức rủi ro" }, { status: 400 });
      }

      const riskReason = normalizeOptionalText(body.riskReason);

      await updateCustomer(id, {
        riskLevel,
        riskReason,
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "risk",
            title: `Cập nhật rủi ro: ${riskLevel}`,
            note: riskReason,
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "adjust_points") {
      const points = Number(body.points);
      const reason = normalizeOptionalText(body.reason);

      if (!Number.isFinite(points) || points === 0 || !reason) {
        return NextResponse.json(
          { error: "Vui lòng nhập số điểm và lý do điều chỉnh" },
          { status: 400 },
        );
      }

      const adjustedPoints = Math.trunc(points);
      const adjustment = {
        id: createId(),
        points: adjustedPoints,
        reason,
        actor,
        createdAt: new Date(),
      };

      await updateCustomer(id, {
        loyaltyPoints: Math.max(0, customer.loyaltyPoints + adjustedPoints),
        pointAdjustments: [adjustment, ...(customer.pointAdjustments ?? [])].slice(0, 100),
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "points",
            title: `${adjustedPoints > 0 ? "Cộng" : "Trừ"} ${Math.abs(
              adjustedPoints,
            )} điểm`,
            note: reason,
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "issue_voucher") {
      const voucherId = typeof body.voucherId === "string" ? body.voucherId : "";
      const campaigns = await getMarketingCampaigns();
      const campaign = campaigns.find((item) => item.id === voucherId);

      if (!campaign || campaign.type !== "voucher") {
        return NextResponse.json({ error: "Không tìm thấy voucher" }, { status: 404 });
      }

      if (campaign.status !== "active") {
        return NextResponse.json(
          { error: "Voucher này chưa ở trạng thái hoạt động" },
          { status: 400 },
        );
      }

      const issue: CustomerVoucherIssue = {
        id: createId(),
        voucherId: campaign.id,
        voucherCode: campaign.code,
        title: campaign.title || campaign.name,
        note: normalizeOptionalText(body.note),
        actor,
        createdAt: new Date(),
      };

      await updateCustomer(id, {
        issuedVouchers: [issue, ...(customer.issuedVouchers ?? [])].slice(0, 100),
        careLogs: appendLog(
          careLogs,
          createLog({
            type: "voucher",
            title: `Phát voucher ${campaign.code ?? campaign.name}`,
            note: issue.note,
            actor,
          }),
        ),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Thao tác không được hỗ trợ" }, { status: 400 });
  } catch (error) {
    console.error("CRM action failed:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật CRM khách hàng" },
      { status: 500 },
    );
  }
}
