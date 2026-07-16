import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs, getDoc, addDoc, doc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { WholesaleProduct, WholesaleProductInput } from "@/types";

const db = getFirestore();

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const productsRef = collection(db, "wholesale_products");
    const snapshot = await getDocs(productsRef);
    
    const products: WholesaleProduct[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        productId: data.productId,
        productName: data.productName,
        wholesalePrice: data.wholesalePrice,
        minimumOrderQuantity: data.minimumOrderQuantity,
        stock: data.stock,
        isAvailable: data.isAvailable,
        tierDiscounts: data.tierDiscounts,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching wholesale products:", error);
    return NextResponse.json(
      { error: "Failed to fetch wholesale products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body: WholesaleProductInput = await request.json();

    // Validate required fields
    if (!body.productId || !body.wholesalePrice || !body.minimumOrderQuantity || body.stock === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: productId, wholesalePrice, minimumOrderQuantity, stock" },
        { status: 400 }
      );
    }

    // Get product name from main products collection
    const productRef = doc(db, "products", body.productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const productName = productSnap.data().name;

    const productData = {
      productId: body.productId,
      productName: productName,
      wholesalePrice: body.wholesalePrice,
      minimumOrderQuantity: body.minimumOrderQuantity,
      stock: body.stock,
      isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
      tierDiscounts: body.tierDiscounts || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "wholesale_products"), productData);

    return NextResponse.json({ id: docRef.id, ...productData }, { status: 201 });
  } catch (error) {
    console.error("Error creating wholesale product:", error);
    return NextResponse.json(
      { error: "Failed to create wholesale product" },
      { status: 500 }
    );
  }
}
