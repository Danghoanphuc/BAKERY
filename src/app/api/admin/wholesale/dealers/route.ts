import { NextResponse } from "next/server";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/firebase/app";
import type { Dealer, DealerInput } from "@/types";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const dealersRef = collection(db, "dealers");
    const snapshot = await getDocs(dealersRef);
    
    const dealers: Dealer[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
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
    });

    return NextResponse.json(dealers);
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body: DealerInput = await request.json();

    // Validate required fields
    if (!body.name || !body.phone || !body.address || !body.district || !body.city || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, address, district, city, type" },
        { status: 400 }
      );
    }

    const dealerData = {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address,
      district: body.district,
      city: body.city,
      type: body.type,
      status: "pending" as const,
      tier: "regular" as const,
      discountPercent: 0,
      creditLimit: body.creditLimit || 5000000, // Default 5M VND
      currentDebt: 0,
      paymentTerms: body.paymentTerms || "cod",
      businessLicense: body.businessLicense || null,
      taxId: body.taxId || null,
      contactPerson: body.contactPerson || null,
      contactPhone: body.contactPhone || null,
      notes: body.notes || null,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      lastOrderAt: null,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "dealers"), dealerData);

    return NextResponse.json({ id: docRef.id, ...dealerData }, { status: 201 });
  } catch (error) {
    console.error("Error creating dealer:", error);
    return NextResponse.json(
      { error: "Failed to create dealer" },
      { status: 500 }
    );
  }
}
