import { Product } from "./product";

export interface CartItem {
  productId: string;
  quantity: number;
  price: number; // snapshot of price at time of addition
  product: Product; // denormalized for display
}
