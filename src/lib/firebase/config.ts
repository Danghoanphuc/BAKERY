import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  waitForPendingWrites,
  writeBatch,
} from "firebase/firestore";

function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item));
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      const value = stripUndefined(obj[key]);
      if (value !== undefined) {
        newObj[key] = value;
      } else {
        console.log("Removing undefined field:", key, "from object:", obj);
      }
    }
    return newObj;
  }
  return obj;
}
import { db } from "./app";
import type { Category, Product, Order } from "@/types";
import { isProductListed } from "@/lib/product-availability";
import {
  normalizeCategoryReference,
  productBelongsToCategory,
  resolveCanonicalCategoryId,
} from "@/lib/product-category";

// Re-export db for other modules
export { db };

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
  isVisible?: boolean;
}): Promise<Category> {
  const baseId =
    normalizeCategoryReference(data.name) || `category-${Date.now()}`;
  let id = baseId;
  let suffix = 2;
  while ((await getDoc(doc(db, "categories", id))).exists()) {
    id = `${baseId}-${suffix++}`;
  }

  const payload = {
    name: data.name.trim(),
    iconUrl: data.iconUrl,
    displayOrder: data.displayOrder ?? 0,
    isVisible: data.isVisible ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(doc(db, "categories", id), payload);
  return {
    id,
    name: payload.name,
    iconUrl: payload.iconUrl,
    displayOrder: payload.displayOrder,
    isVisible: payload.isVisible,
  };
}

export async function updateCategory(
  id: string,
  data: Partial<Category>,
): Promise<Category> {
  const docRef = doc(db, "categories", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });

  // Fetch and return the updated category
  const updatedDoc = await getDoc(docRef);
  if (!updatedDoc.exists()) {
    throw new Error("Category not found after update");
  }

  const categoryData = updatedDoc.data();
  return {
    id: updatedDoc.id,
    ...categoryData,
    createdAt:
      categoryData.createdAt?.toDate?.()?.toISOString() ||
      new Date().toISOString(),
    updatedAt:
      categoryData.updatedAt?.toDate?.()?.toISOString() ||
      new Date().toISOString(),
  } as unknown as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const [categorySnap, productsSnap] = await Promise.all([
    getDoc(doc(db, "categories", id)),
    getDocs(collection(db, "products")),
  ]);
  const category = categorySnap.exists()
    ? ({ id: categorySnap.id, ...categorySnap.data() } as Category)
    : null;
  const hasAssignedProducts =
    category &&
    productsSnap.docs.some((productDoc) =>
      productBelongsToCategory(productDoc.data() as Product, category),
    );

  if (hasAssignedProducts) {
    throw new Error("CATEGORY_HAS_PRODUCTS");
  }

  await deleteDoc(doc(db, "categories", id));
}

export async function moveCategoryProducts(
  fromCategoryId: string,
  toCategoryId: string,
): Promise<number> {
  const [categorySnap, productsSnap] = await Promise.all([
    getDoc(doc(db, "categories", fromCategoryId)),
    getDocs(collection(db, "products")),
  ]);
  if (!categorySnap.exists()) return 0;
  const category = { id: categorySnap.id, ...categorySnap.data() } as Category;
  const assignedProductDocs = productsSnap.docs.filter((productDoc) =>
    productBelongsToCategory(productDoc.data() as Product, category),
  );
  if (assignedProductDocs.length === 0) return 0;

  const batch = writeBatch(db);
  assignedProductDocs.forEach((productDoc) => {
    batch.update(productDoc.ref, {
      categoryId: toCategoryId,
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
  return assignedProductDocs.length;
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
    const products = await getAllProducts();
    return products.filter(isProductListed);
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      getAllProducts(),
    ]);
    const category =
      categories.find((item) => item.id === categoryId) ??
      categories.find(
        (item) =>
          normalizeCategoryReference(item.name) ===
          normalizeCategoryReference(categoryId),
      );

    if (!category) return [];

    return products.filter(
      (product) =>
        isProductListed(product) && productBelongsToCategory(product, category),
    );
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const products = await getAllProducts();
    return products.filter(
      (product) => isProductListed(product) && product.isFeatured === true,
    );
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
  const categories = await getCategories();
  const categoryId = resolveCanonicalCategoryId(data.categoryId, categories);
  const docRef = await addDoc(collection(db, "products"), {
    ...stripUndefined({
      ...data,
      categoryId,
      isAvailable: data.isAvailable !== false,
    }),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await waitForPendingWrites(db);
  const docSnap = await getDocFromServer(docRef);
  return { id: docRef.id, ...docSnap.data() } as Product;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>,
): Promise<Product> {
  const docRef = doc(db, "products", id);
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...productData } = data;

  let nextData = { ...productData };
  if (typeof nextData.categoryId === "string") {
    const categories = await getCategories();
    nextData = {
      ...nextData,
      categoryId: resolveCanonicalCategoryId(nextData.categoryId, categories),
    };
  }

  await updateDoc(docRef, {
    ...stripUndefined(nextData),
    updatedAt: Timestamp.now(),
  });

  await waitForPendingWrites(db);
  const docSnap = await getDocFromServer(docRef);
  if (!docSnap.exists()) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const updated = { id: docSnap.id, ...docSnap.data() } as Product;

  if (typeof data.name === "string" && data.name.trim()) {
    await syncWholesaleProductName(id, data.name.trim());
  }

  return updated;
}

async function syncWholesaleProductName(productId: string, productName: string) {
  try {
    const wholesaleQuery = query(
      collection(db, "wholesale_products"),
      where("productId", "==", productId),
    );
    const snapshot = await getDocs(wholesaleQuery);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((wholesaleDoc) => {
      batch.update(wholesaleDoc.ref, {
        productName,
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();
  } catch (error) {
    console.error("Failed to sync wholesale product name:", error);
  }
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
    return mapOrdersSorted(snapshot.docs);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

export async function getOrdersByCustomer(
  customerId: string,
): Promise<Order[]> {
  try {
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
    );
    const snapshot = await getDocs(q);
    return mapOrdersSorted(snapshot.docs);
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
}

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, "orders"),
      where("customerPhone", "==", phone),
    );
    const snapshot = await getDocs(q);
    return mapOrdersSorted(snapshot.docs);
  } catch (error) {
    console.error("Error fetching orders by phone:", error);
    return [];
  }
}

function mapOrdersSorted(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
) {
  const orders = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<Order & { createdAt?: unknown }>;

  return orders.sort(
    (a, b) => getOrderTimestamp(b.createdAt) - getOrderTimestamp(a.createdAt),
  );
}

function getOrderTimestamp(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  return 0;
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const docRef = doc(db, "orders", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { normalizeOrder } = await import("./utils");
      return normalizeOrder(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

export async function getOrderByPayOSOrderCode(
  payosOrderCode: number,
): Promise<Order | null> {
  try {
    const q = query(
      collection(db, "orders"),
      where("payosOrderCode", "==", payosOrderCode),
    );
    const snapshot = await getDocs(q);
    const orderDoc = snapshot.docs[0];

    if (!orderDoc) return null;
    const { normalizeOrder } = await import("./utils");
    return normalizeOrder(orderDoc.id, orderDoc.data());
  } catch (error) {
    console.error("Error fetching order by payOS order code:", error);
    return null;
  }
}

export async function createOrder(data: any): Promise<Order> {
  console.log("createOrder data (raw):", data);
  const cleanedData = stripUndefined(data);
  console.log("createOrder cleanedData:", cleanedData);
  const docRef = await addDoc(collection(db, "orders"), {
    ...cleanedData,
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
