import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/firebase/app";
import type { WholesaleProductInput } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const productRef = doc(db, "wholesale_products", id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return NextResponse.json(
        { error: "Wholesale product not found" },
        { status: 404 }
      );
    }

    const data = productSnap.data();
    const product = {
      id: productSnap.id,
      productId: data.productId,
      productName: data.productName,
      wholesalePrice: data.wholesalePrice,
      minimumOrderQuantity: data.minimumOrderQuantity,
      stock: data.stock,
      isAvailable: data.isAvailable,
      tierDiscounts: data.tierDiscounts,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching wholesale product:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale product" },
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
    const body: Partial<WholesaleProductInput> = await request.json();

    const productRef = doc(db, "wholesale_products", id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return NextResponse.json(
        { error: "Wholesale product not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (body.wholesalePrice !== undefined) updateData.wholesalePrice = body.wholesalePrice;
    if (body.minimumOrderQuantity !== undefined) updateData.minimumOrderQuantity = body.minimumOrderQuantity;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
    if (body.tierDiscounts !== undefined) updateData.tierDiscounts = body.tierDiscounts;

    await updateDoc(productRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating wholesale product:", error);
    return NextResponse.json(
      { error: "Failed to update wholesale product" },
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
    const productRef = doc(db, "wholesale_products", id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return NextResponse.json(
        { error: "Wholesale product not found" },
        { status: 404 }
      );
    }

    await deleteDoc(productRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wholesale product:", error);
    return NextResponse.json(
      { error: "Failed to delete wholesale product" },
      { status: 500 }
    );
  }
}
