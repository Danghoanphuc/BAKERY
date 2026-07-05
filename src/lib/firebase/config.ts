import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./app";
import type { Category, Product, Order } from "@/types";

// ============================================
// CATEGORIES
// ============================================

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(
      collection(db, "categories"),
      orderBy("displayOrder", "asc"),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const docRef = doc(db, "categories", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Category;
    }
    return null;
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}

export async function createCategory(data: {
  name: string;
  iconUrl: string;
  displayOrder?: number;
}): Promise<Category> {
  const docRef = await addDoc(collection(db, "categories"), {
    ...data,
    displayOrder: data.displayOrder ?? 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...docSnap.data() } as Category;
}

export async function updateCategory(
  id: string,
  data: Partial<Category>,
): Promise<void> {
  const docRef = doc(db, "categories", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  // Check if category has products
  const productsQuery = query(
    collection(db, "products"),
    where("categoryId", "==", id),
  );
  const productsSnap = await getDocs(productsQuery);

  if (!productsSnap.empty) {
    throw new Error("CATEGORY_HAS_PRODUCTS");
  }

  await deleteDoc(doc(db, "categories", id));
}

export async function reorderCategories(
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((item) => {
    const docRef = doc(db, "categories", item.id);
    batch.update(docRef, { displayOrder: item.displayOrder });
  });
  await batch.commit();
}

// ============================================
// PRODUCTS
// ============================================

export async function getAllProducts(): Promise<Product[]> {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const q = query(
      collection(db, "products"),
      where("isAvailable", "==", true),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  try {
    const q = query(
      collection(db, "products"),
      where("categoryId", "==", categoryId),
      where("isAvailable", "==", true),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const q = query(
      collection(db, "products"),
      where("isFeatured", "==", true),
      where("isAvailable", "==", true),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, "products", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

export async function getProductByIdAdmin(id: string): Promise<Product | null> {
  return getProductById(id);
}

export async function createProduct(data: any): Promise<Product> {
  const docRef = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...docSnap.data() } as Product;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>,
): Promise<void> {
  const docRef = doc(db, "products", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ============================================
// ORDERS
// ============================================

export async function getOrders(): Promise<Order[]> {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const docRef = doc(db, "orders", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

export async function createOrder(data: any): Promise<Order> {
  const docRef = await addDoc(collection(db, "orders"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...docSnap.data() } as Order;
}

export async function updateOrder(
  id: string,
  data: Partial<Order>,
): Promise<void> {
  const docRef = doc(db, "orders", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function updateOrderStatus(
  id: string,
  status: string,
  metadata?: { note?: string; actor?: string },
): Promise<void> {
  const docRef = doc(db, "orders", id);
  const orderSnap = await getDoc(docRef);

  if (!orderSnap.exists()) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const order = orderSnap.data();
  const statusHistory = order.statusHistory || [];

  await updateDoc(docRef, {
    status,
    statusHistory: [
      ...statusHistory,
      {
        status,
        at: new Date().toISOString(),
        actor: metadata?.actor || "admin",
        note: metadata?.note,
      },
    ],
    updatedAt: Timestamp.now(),
  });
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BK${year}${month}${day}${random}`;
}
