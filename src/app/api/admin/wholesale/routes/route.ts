import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { DeliveryRoute, DeliveryRouteInput } from "@/types";

const db = getFirestore();

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const routesRef = collection(db, "delivery_routes");
    const snapshot = await getDocs(routesRef);
    
    const routes: DeliveryRoute[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        dealerIds: data.dealerIds || [],
        scheduleDays: data.scheduleDays || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        driver: data.driver,
        driverPhone: data.driverPhone,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error("Error fetching delivery routes:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery routes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body: DeliveryRouteInput = await request.json();

    // Validate required fields
    if (!body.name || !body.dealerIds || !body.scheduleDays) {
      return NextResponse.json(
        { error: "Missing required fields: name, dealerIds, scheduleDays" },
        { status: 400 }
      );
    }

    const routeData = {
      name: body.name,
      description: body.description || null,
      dealerIds: body.dealerIds,
      scheduleDays: body.scheduleDays,
      isActive: true,
      driver: body.driver || null,
      driverPhone: body.driverPhone || null,
      notes: body.notes || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "delivery_routes"), routeData);

    return NextResponse.json({ id: docRef.id, ...routeData }, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery route:", error);
    return NextResponse.json(
      { error: "Failed to create delivery route" },
      { status: 500 }
    );
  }
}
