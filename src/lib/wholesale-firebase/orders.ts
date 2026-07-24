import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import type { Order } from "@/types";
import { db } from "./config";
import { normalizeOrder } from "./utils";

const COLLECTION_NAME = "orders";

export async function getAllOrders(limitCount?: number): Promise<Order[]> {
  try {
    const ordersRef = collection(db, COLLECTION_NAME);
    const ordersQuery =
      typeof limitCount === "number"
        ? query(ordersRef, orderBy("createdAt", "desc"), limit(limitCount))
        : query(ordersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(ordersQuery);

    return snapshot.docs.map((orderDoc) =>
      normalizeOrder(orderDoc.id, orderDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}
