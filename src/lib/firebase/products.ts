import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";
import type { InventoryProduct, Product } from "@/types";
import { getAllCategories } from "./categories";
import { isProductListed } from "@/lib/product-availability";
import { productBelongsToCategory } from "@/lib/product-category";
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
 * Lấy sản phẩm theo danh mục (hỗ trợ legacy categoryId = tên danh mục)
 */
export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  try {
    const [categories, products] = await Promise.all([
      getAllCategories(),
      getAllProducts(),
    ]);
    const category =
      categories.find((item) => item.id === categoryId) ??
      categories.find((item) => item.name === categoryId);

    if (!category) return [];

    return products.filter((product) =>
      productBelongsToCategory(product, category),
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
    const products = await getAllProducts();
    return products
      .filter(
        (product) => isProductListed(product) && product.isFeatured === true,
      )
      .slice(0, limitCount);
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
    const products = await getAllProducts();
    return products
      .filter((product) => isProductListed(product) && product.isNew === true)
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
    const products = await getAllProducts();
    return products
      .filter(
        (product) => isProductListed(product) && product.isBestseller === true,
      )
      .slice(0, limitCount);
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

    return products.map((product) => {
      const category = categories.find((item) =>
        productBelongsToCategory(product, item),
      );

      return {
        ...product,
        stock: product.stock ?? 0,
        isAvailable: product.isAvailable !== false,
        category: category?.name ?? "Chưa phân loại",
      };
    });
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
