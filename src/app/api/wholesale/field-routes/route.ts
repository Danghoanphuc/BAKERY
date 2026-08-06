import { NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import { getConfiguredAdminPrincipals } from "@/lib/auth/admin-session";
import {
  createSalesRouteRun,
  createSalesRouteTemplate,
  isBusinessDate,
  listRouteDealers,
  listRouteWholesaleProducts,
  listSalesRouteRuns,
  listSalesRouteTemplates,
  normalizeRouteScheduleDays,
} from "@/features/wholesale-routes";
import { routeApiError } from "@/features/wholesale-routes/api";
import type { SalesRouteTemplateInput } from "@/types";

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assignableStaff(principal: NonNullable<ReturnType<typeof getAdminSession>>) {
  const staff = getConfiguredAdminPrincipals()
    .filter((account) => ["sales", "manager", "owner"].includes(account.role))
    .map(({ id, name, role }) => ({ id, name, role }));
  if (!staff.some((account) => account.id === principal.id)) {
    staff.push({ id: principal.id, name: principal.name, role: principal.role });
  }
  return staff;
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const principal = getAdminSession(request)!;
  const date =
    new URL(request.url).searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);
  if (!isBusinessDate(date)) {
    return NextResponse.json({ error: "Ngày vận hành không hợp lệ." }, { status: 400 });
  }

  try {
    const [templates, runs, dealers, products] = await Promise.all([
      principal.role === "sales" ? Promise.resolve([]) : listSalesRouteTemplates(),
      listSalesRouteRuns(date, principal),
      principal.role === "sales" ? Promise.resolve([]) : listRouteDealers(),
      listRouteWholesaleProducts(),
    ]);
    const staff =
      principal.role === "sales"
        ? [{ id: principal.id, name: principal.name, role: principal.role }]
        : assignableStaff(principal);
    return NextResponse.json({
      principal,
      businessDate: date,
      templates,
      runs,
      dealers,
      products,
      staff,
    });
  } catch (error) {
    return routeApiError(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const principal = getAdminSession(request)!;
  if (principal.role === "sales") {
    return NextResponse.json(
      { error: "Nhân viên thị trường không thể lập tuyến." },
      { status: 403 },
    );
  }

  try {
    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
    if (body.action === "create_template") {
      const input = body.template as Partial<SalesRouteTemplateInput> | undefined;
      const name = trimmedString(input?.name);
      const assignedRepId = trimmedString(input?.assignedRepId);
      const dealerIds = Array.isArray(input?.dealerIds)
        ? input.dealerIds
            .map(trimmedString)
            .filter((id): id is string => Boolean(id))
        : [];
      const scheduleDays = normalizeRouteScheduleDays(input?.scheduleDays);
      const assignee = assignableStaff(principal).find(
        (account) => account.id === assignedRepId,
      );
      if (!name || name.length > 120 || !assignee || !dealerIds.length || !scheduleDays.length) {
        return NextResponse.json(
          { error: "Tên tuyến, lịch, nhân viên và ít nhất một đại lý là bắt buộc." },
          { status: 400 },
        );
      }
      if (new Set(dealerIds).size > 100) {
        return NextResponse.json(
          { error: "Mỗi tuyến hỗ trợ tối đa 100 điểm ghé." },
          { status: 400 },
        );
      }
      const template = await createSalesRouteTemplate({
        name,
        description: trimmedString(input?.description).slice(0, 500) || undefined,
        assignedRepId,
        assignedRepName: assignee.name,
        dealerIds,
        scheduleDays,
      }, principal);
      return NextResponse.json({ template }, { status: 201 });
    }

    if (body.action === "create_run") {
      const templateId = String(body.templateId ?? "");
      const businessDate = String(body.businessDate ?? "");
      if (!templateId || !isBusinessDate(businessDate)) {
        return NextResponse.json(
          { error: "Tuyến mẫu hoặc ngày vận hành không hợp lệ." },
          { status: 400 },
        );
      }
      const run = await createSalesRouteRun(templateId, businessDate, principal);
      return NextResponse.json({ run }, { status: 201 });
    }

    return NextResponse.json({ error: "Thao tác không được hỗ trợ." }, { status: 400 });
  } catch (error) {
    return routeApiError(error);
  }
}
