import type {
  MarketingCampaignStatus,
  MarketingCampaignType,
  MarketingDiscountType,
} from "@/types";

export const statusLabels: Record<MarketingCampaignStatus, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  expired: "Kết thúc",
};

export const typeLabels: Record<MarketingCampaignType, string> = {
  campaign: "Chiến dịch",
  voucher: "Voucher",
  loyalty: "Tích điểm",
};

export const discountLabels: Record<MarketingDiscountType, string> = {
  percent: "Giảm %",
  amount: "Giảm tiền",
  gift_item: "Tặng món",
  free_shipping: "Miễn ship",
  buy_x_get_y: "Mua X tặng Y",
  points_multiplier: "Nhân điểm",
};
