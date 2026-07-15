import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllCustomers, getAllOrders, getMarketingSettings, updateMarketingSettings } from "@/lib/firebase";
import { activateLoyaltyVersion, createLoyaltyVersion, getLoyaltyWorkspaceData, saveLoyaltyEntity } from "@/lib/firebase/loyalty";
import type { MarketingSettingsInput } from "@/types";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request); if (unauthorized) return unauthorized;
  const [settings, workspace, customers, orders] = await Promise.all([
    getMarketingSettings(), getLoyaltyWorkspaceData(), getAllCustomers(), getAllOrders(),
  ]);
  const completedOrders = orders.filter((order) => ["completed", "delivered"].includes(order.status));
  const activeCustomers = customers.filter((customer) => customer.status === "active");
  const outstandingPoints = customers.reduce((sum, customer) => sum + Math.max(0, customer.loyaltyPoints), 0);
  const tierDistribution = settings.tiers.map((tier, index, tiers) => ({
    id: tier.id, name: tier.name,
    count: customers.filter((customer) => customer.loyaltyPoints >= tier.threshold && (!tiers[index + 1] || customer.loyaltyPoints < tiers[index + 1].threshold)).length,
  }));
  return NextResponse.json({
    settings, ...workspace,
    stats: {
      members: customers.length,
      activeMembers: activeCustomers.length,
      outstandingPoints,
      estimatedLiability: outstandingPoints * settings.pointsPerAmount * 0.03,
      completedOrders: completedOrders.length,
      memberRevenue: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      tierDistribution,
    },
  });
}

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request); if (unauthorized) return unauthorized;
  const body = await request.json() as MarketingSettingsInput;
  if (!body || !Array.isArray(body.tiers) || !Number.isFinite(body.pointsPerAmount)) {
    return NextResponse.json({ error: "Cấu hình không hợp lệ." }, { status: 400 });
  }
  const settings = await updateMarketingSettings(body);
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request); if (unauthorized) return unauthorized;
  const body = await request.json() as Record<string, unknown>;
  if (body.action === "save_entity" && ["rule", "reward", "segment"].includes(String(body.kind)) && body.value && typeof body.value === "object") {
    return NextResponse.json(await saveLoyaltyEntity(body.kind as "rule" | "reward" | "segment", body.value as Record<string, unknown>));
  }
  if (body.action === "create_version" && body.snapshot && typeof body.snapshot === "object") {
    return NextResponse.json(await createLoyaltyVersion(body.snapshot as Record<string, unknown>, String(body.name || "Phiên bản mới"), typeof body.note === "string" ? body.note : undefined));
  }
  if (body.action === "activate_version" && typeof body.id === "string") {
    const snapshot = await activateLoyaltyVersion(body.id);
    const settings = snapshot?.settings;
    if (settings && typeof settings === "object") {
      await updateMarketingSettings(settings as MarketingSettingsInput);
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
