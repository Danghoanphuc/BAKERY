export interface Category {
  id: string;
  name: string;
  iconUrl: string;
  displayOrder?: number;
  isVisible?: boolean;
  productCount?: number;
  activeProductCount?: number;
  outOfStockProductCount?: number;
}
