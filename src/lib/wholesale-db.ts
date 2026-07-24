// Re-export all Firebase functions
export {
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategoryProducts,
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
  getOrdersPage,
  getOrdersByCustomer,
  getOrdersByPhone,
  getOrderById,
  getOrderByPayOSOrderCode,
  createOrder,
  updateOrder,
  transitionOrderAtomically,
  transitionOrdersAtomically,
  updateOrderOperationsAtomically,
  updateOrderStatus,
  generateOrderNumber,
} from "./wholesale-firebase/config";

// Alias for compatibility
export { getCategories as getCategoriesWithProducts } from "./wholesale-firebase/config";
export { getProducts as getAvailableProducts } from "./wholesale-firebase/config";
