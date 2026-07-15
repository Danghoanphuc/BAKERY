// Export Firebase configuration
export { app, db, storage } from "./app";

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
  buildMagicLinkUrl,
  createCustomer,
  createCustomerWithMagicLink,
  createMagicLinkForCustomer,
  createOrUpdateCustomerFromPurchase,
  deleteCustomer,
  awardCustomerLoyaltyPoints,
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
  getVoucherRedemptionUsage,
  getVoucherRedemptions,
  getVoucherIssues,
  getVoucherAuditLog,
  getVoucherCampaignVersions,
  issueVoucherToCustomer,
  recordVoucherRedemption,
  updateVoucherCampaignLifecycle,
  updateMarketingCampaign,
  updateMarketingSettings,
} from "./marketing";

export {
  createFinanceExpense,
  getFinanceExpenses,
} from "./finance";

export { getLoyaltyWorkspaceData } from "./loyalty";
