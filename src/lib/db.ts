// Re-export all Firebase functions
export {
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  // Products
  getAllProducts,
  getProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getProductById,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  // Orders
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  generateOrderNumber,
} from "./firebase/config";

// Alias for compatibility
export { getCategories as getCategoriesWithProducts } from "./firebase/config";
export { getProducts as getAvailableProducts } from "./firebase/config";
