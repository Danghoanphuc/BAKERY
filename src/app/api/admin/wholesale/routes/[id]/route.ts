import { NextResponse } from "next/server";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { DeliveryRouteInput } from "@/types";

const db = getFirestore();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const routeRef = doc(db, "delivery_routes", params.id);
    const routeSnap = await getDoc(routeRef);

    if (!routeSnap.exists()) {
      return NextResponse.json(
        { error: "Delivery route not found" },
        { status: 404 }
      );
    }

    const data = routeSnap.data();
    const route = {
      id: routeSnap.id,
      name: data.name,
      description: data.description,
      dealerIds: data.dealerIds || [],
      scheduleDays: data.scheduleDays || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      driver: data.driver,
      driverPhone: data.driverPhone,
      notes: data.notes,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };

    return NextResponse.json(route);
  } catch (error) {
    console.error("Error fetching delivery route:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery route" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body: Partial<DeliveryRouteInput> & { isActive?: boolean } = await request.json();

    const routeRef = doc(db, "delivery_routes", params.id);
    const routeSnap = await getDoc(routeRef);

    if (!routeSnap.exists()) {
      return NextResponse.json(
        { error: "Delivery route not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dealerIds !== undefined) updateData.dealerIds = body.dealerIds;
    if (body.scheduleDays !== undefined) updateData.scheduleDays = body.scheduleDays;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.driver !== undefined) updateData.driver = body.driver;
    if (body.driverPhone !== undefined) updateData.driverPhone = body.driverPhone;
    if (body.notes !== undefined) updateData.notes = body.notes;

    await updateDoc(routeRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating delivery route:", error);
    return NextResponse.json(
      { error: "Failed to update delivery route" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const routeRef = doc(db, "delivery_routes", params.id);
    const routeSnap = await getDoc(routeRef);

    if (!routeSnap.exists()) {
      return NextResponse.json(
        { error: "Delivery route not found" },
        { status: 404 }
      );
    }

    await deleteDoc(routeRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting delivery route:", error);
    return NextResponse.json(
      { error: "Failed to delete delivery route" },
      { status: 500 }
    );
  }
}
