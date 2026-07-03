import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";
import type { InventoryProduct, Product } from "@/types";
import { getAllCategories } from "./categories";
import { normalizeProduct } from "./utils";

const COLLECTION_NAME = "products";

/**
 * Lấy tất cả sản phẩm
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(productsRef);

    return snapshot.docs.map((productDoc) =>
      normalizeProduct(productDoc.id, productDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/**
 * Lấy sản phẩm theo ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return normalizeProduct(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

/**
 * Lấy sản phẩm theo danh mục
 */
export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  try {
    const productsRef = collection(db, COLLECTION_NAME);
    const q = query(productsRef, where("categoryId", "==", categoryId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((productDoc) =>
      normalizeProduct(productDoc.id, productDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

/**
 * Lấy sản phẩm nổi bật (featured)
 */
export async function getFeaturedProducts(
  limitCount: number = 10,
): Promise<Product[]> {
  try {
    const productsRef = collection(db, COLLECTION_NAME);
    const q = query(
      productsRef,
      where("isFeatured", "==", true),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((productDoc) =>
      normalizeProduct(productDoc.id, productDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

/**
 * Lấy sản phẩm mới nhất
 */
export async function getNewProducts(
  limitCount: number = 10,
): Promise<Product[]> {
  try {
    const productsRef = collection(db, COLLECTION_NAME);
    const q = query(productsRef, where("isNew", "==", true));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((productDoc) => normalizeProduct(productDoc.id, productDoc.data()))
      .sort(
        (left, right) =>
          (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0),
      )
      .slice(0, limitCount);
  } catch (error) {
    console.error("Error fetching new products:", error);
    return [];
  }
}

/**
 * Lấy sản phẩm bán chạy
 */
export async function getBestsellerProducts(
  limitCount: number = 10,
): Promise<Product[]> {
  try {
    const productsRef = collection(db, COLLECTION_NAME);
    const q = query(
      productsRef,
      where("isBestseller", "==", true),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((productDoc) =>
      normalizeProduct(productDoc.id, productDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching bestseller products:", error);
    return [];
  }
}

export async function getInventoryProducts(): Promise<InventoryProduct[]> {
  try {
    const [products, categories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);

    const categoriesById = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    return products.map((product) => ({
      ...product,
      stock: product.stock ?? 0,
      isAvailable: product.isAvailable ?? true,
      category: product.categoryId
        ? (categoriesById.get(product.categoryId) ?? "Chưa phân loại")
        : "Chưa phân loại",
    }));
  } catch (error) {
    console.error("Error fetching inventory products:", error);
    return [];
  }
}

export async function updateProductAvailability(
  productId: string,
  isAvailable: boolean,
): Promise<void> {
  const productRef = doc(db, COLLECTION_NAME, productId);
  await updateDoc(productRef, {
    isAvailable,
    updatedAt: new Date(),
  });
}
