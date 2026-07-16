import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/firebase/app";
import type { Dealer, DealerInput } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const dealerRef = doc(db, "dealers", id);
    const dealerSnap = await getDoc(dealerRef);

    if (!dealerSnap.exists()) {
      return NextResponse.json(
        { error: "Dealer not found" },
        { status: 404 }
      );
    }

    const data = dealerSnap.data();
    const dealer: Dealer = {
      id: dealerSnap.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      district: data.district,
      city: data.city,
      type: data.type,
      status: data.status,
      tier: data.tier,
      discountPercent: data.discountPercent || 0,
      creditLimit: data.creditLimit || 0,
      currentDebt: data.currentDebt || 0,
      paymentTerms: data.paymentTerms || "cod",
      businessLicense: data.businessLicense,
      taxId: data.taxId,
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      notes: data.notes,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt?.toDate(),
      rejectionReason: data.rejectionReason,
      lastOrderAt: data.lastOrderAt?.toDate(),
      totalOrders: data.totalOrders || 0,
      totalSpent: data.totalSpent || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    return NextResponse.json(dealer);
  } catch (error) {
    console.error("Error fetching dealer:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const body: Partial<DealerInput> & { tier?: string; discountPercent?: number; creditLimit?: number; paymentTerms?: string } = await request.json();

    const dealerRef = doc(db, "dealers", id);
    const dealerSnap = await getDoc(dealerRef);

    if (!dealerSnap.exists()) {
      return NextResponse.json(
        { error: "Dealer not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.address) updateData.address = body.address;
    if (body.district) updateData.district = body.district;
    if (body.city) updateData.city = body.city;
    if (body.type) updateData.type = body.type;
    if (body.businessLicense !== undefined) updateData.businessLicense = body.businessLicense || null;
    if (body.taxId !== undefined) updateData.taxId = body.taxId || null;
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson || null;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit;
    if (body.paymentTerms) updateData.paymentTerms = body.paymentTerms;
    if (body.tier) updateData.tier = body.tier;
    if (body.discountPercent !== undefined) updateData.discountPercent = body.discountPercent;

    await updateDoc(dealerRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dealer:", error);
    return NextResponse.json(
      { error: "Failed to update dealer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const dealerRef = doc(db, "dealers", id);
    const dealerSnap = await getDoc(dealerRef);

    if (!dealerSnap.exists()) {
      return NextResponse.json(
        { error: "Dealer not found" },
        { status: 404 }
      );
    }

    await deleteDoc(dealerRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dealer:", error);
    return NextResponse.json(
      { error: "Failed to delete dealer" },
      { status: 500 }
    );
  }
}
