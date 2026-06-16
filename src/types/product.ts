export interface Product {
  id: string;
  name: string;
  price: number; // in VND
  imageUrl: string;
  categoryId: string;
  description?: string;
  availableForDelivery?: boolean;
  availableForPickup?: boolean;
}
