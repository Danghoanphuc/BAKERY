export type CustomerStatus = "invited" | "active" | "paused";
export type LoyaltyTier = "new" | "silver" | "gold" | "vip";
export type MagicLinkStatus = "pending" | "used" | "expired";

export interface CustomerPersonalization {
  birthday?: string;
  favoriteFlavors?: string[];
  favoriteProducts?: string[];
  dietaryNotes?: string;
  defaultDeliveryAddress?: string;
  specialOccasions?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: CustomerStatus;
  loyaltyPoints: number;
  tier: LoyaltyTier;
  currentMagicLinkToken?: string;
  magicLinkExpiresAt?: Date;
  inviteSentAt?: Date;
  lastOrderAt?: Date;
  lastLoginAt?: Date;
  zaloUserId?: string;
  personalization: CustomerPersonalization;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerMagicLink {
  id: string;
  token: string;
  customerId: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  firstUserAgent?: string;
  firstIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  status?: CustomerStatus;
  loyaltyPoints?: number;
  tier?: LoyaltyTier;
  currentMagicLinkToken?: string;
  magicLinkExpiresAt?: Date;
  zaloUserId?: string;
  personalization?: CustomerPersonalization;
}

export interface MagicLinkResult {
  customer: Customer;
  token: string;
  urlPath: string;
  expiresAt: Date;
}