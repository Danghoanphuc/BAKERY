// Export Firebase configuration
export { app, db, storage } from "./config";

// Export category functions
export { getAllCategories, getCategoryById } from "./categories";

// Export product functions
export {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getNewProducts,
  getBestsellerProducts,
  getInventoryProducts,
  updateProductAvailability,
} from "./products";

// Export order functions
export { getAllOrders } from "./orders";

// Export customer functions
export {
  consumeMagicLink,
  createCustomer,
  createCustomerWithMagicLink,
  createMagicLinkForCustomer,
  createOrUpdateCustomerFromPurchase,
  getAllCustomers,
  getCustomerById,
  getCustomerByPhone,
  getCustomerByZaloUserId,
  updateCustomer,
} from "./customers";

// Export marketing functions
export {
  createMarketingCampaign,
  defaultMarketingSettings,
  deleteMarketingCampaign,
  getMarketingCampaigns,
  getMarketingSettings,
  updateMarketingCampaign,
  updateMarketingSettings,
} from "./marketing";
