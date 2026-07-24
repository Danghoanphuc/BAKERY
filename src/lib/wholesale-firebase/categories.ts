import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./config";
import type { Category } from "@/types/category";
import { normalizeCategory } from "./utils";

const COLLECTION_NAME = "categories";

/**
 * Lấy tất cả danh mục từ Firebase
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, COLLECTION_NAME);
    const q = query(categoriesRef, orderBy("displayOrder", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((categoryDoc) =>
      normalizeCategory(categoryDoc.id, categoryDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

/**
 * Lấy một danh mục theo ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return normalizeCategory(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}
