import { NextResponse } from "next/server";

const ERROR_STATUS: Record<string, number> = {
  ROUTE_FORBIDDEN: 403,
  ROUTE_TEMPLATE_NOT_FOUND: 404,
  ROUTE_RUN_NOT_FOUND: 404,
  ROUTE_STOP_NOT_FOUND: 404,
  ROUTE_DEALER_NOT_FOUND: 404,
  WHOLESALE_PRODUCT_NOT_FOUND: 404,
  INVALID_ROUTE_DEALER: 400,
  ROUTE_TEMPLATE_INACTIVE: 409,
  INVALID_ROUTE_RUN_TRANSITION: 409,
  INVALID_ROUTE_STOP_TRANSITION: 409,
  ROUTE_HAS_OPEN_STOPS: 409,
  ROUTE_NOT_IN_PROGRESS: 409,
  ROUTE_STOP_NOT_ARRIVED: 409,
  ROUTE_STOP_ALREADY_ORDERED: 409,
  ROUTE_LOCATION_REQUIRED: 400,
  ROUTE_OUTCOME_REQUIRED: 400,
  ROUTE_SKIP_REASON_REQUIRED: 400,
  DEALER_NOT_APPROVED: 409,
  DEALER_CREDIT_LIMIT_EXCEEDED: 409,
  WHOLESALE_QUANTITY_INVALID: 400,
  WHOLESALE_MINIMUM_NOT_MET: 409,
  WHOLESALE_STOCK_UNAVAILABLE: 409,
  WHOLESALE_PRICE_INVALID: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  IDEMPOTENCY_ORDER_MISSING: 409,
};

const ERROR_MESSAGES: Record<string, string> = {
  ROUTE_FORBIDDEN: "Bạn không được phân công chuyến này.",
  ROUTE_TEMPLATE_NOT_FOUND: "Không tìm thấy tuyến mẫu.",
  ROUTE_RUN_NOT_FOUND: "Không tìm thấy chuyến đi.",
  ROUTE_STOP_NOT_FOUND: "Không tìm thấy điểm ghé.",
  ROUTE_DEALER_NOT_FOUND: "Một đại lý trong tuyến không còn tồn tại.",
  WHOLESALE_PRODUCT_NOT_FOUND: "Một sản phẩm sỉ không còn tồn tại.",
  INVALID_ROUTE_DEALER: "Tuyến chỉ được chứa đại lý đã duyệt.",
  ROUTE_TEMPLATE_INACTIVE: "Tuyến mẫu đang ngừng hoạt động.",
  INVALID_ROUTE_RUN_TRANSITION: "Chuyến đi không thể chuyển sang trạng thái này.",
  INVALID_ROUTE_STOP_TRANSITION: "Điểm ghé không thể chuyển sang trạng thái này.",
  ROUTE_HAS_OPEN_STOPS: "Hãy hoàn tất hoặc bỏ qua tất cả điểm ghé trước.",
  ROUTE_NOT_IN_PROGRESS: "Hãy bắt đầu chuyến trước khi cập nhật điểm ghé.",
  ROUTE_STOP_NOT_ARRIVED: "Hãy check-in trước khi tạo đơn.",
  ROUTE_STOP_ALREADY_ORDERED: "Điểm ghé này đã có đơn hàng.",
  ROUTE_LOCATION_REQUIRED: "Không lấy được vị trí. Hãy nhập lý do để tiếp tục.",
  ROUTE_OUTCOME_REQUIRED: "Hãy chọn kết quả của lượt ghé.",
  ROUTE_SKIP_REASON_REQUIRED: "Hãy nhập lý do bỏ qua điểm ghé.",
  DEALER_NOT_APPROVED: "Đại lý chưa được duyệt để đặt đơn.",
  DEALER_CREDIT_LIMIT_EXCEEDED: "Đơn hàng vượt hạn mức công nợ của đại lý.",
  WHOLESALE_QUANTITY_INVALID: "Số lượng đặt hàng không hợp lệ.",
  WHOLESALE_MINIMUM_NOT_MET: "Số lượng chưa đạt mức đặt tối thiểu.",
  WHOLESALE_STOCK_UNAVAILABLE: "Sản phẩm không đủ tồn kho sỉ.",
  WHOLESALE_PRICE_INVALID: "Giá sỉ chưa được cấu hình hợp lệ.",
  WHOLESALE_PRODUCT_NOT_ELIGIBLE: "Sản phẩm này không áp dụng cho nhóm đại lý hiện tại.",
  WHOLESALE_LOCATION_MIXED: "Một đơn đi tuyến chỉ được xuất từ một kho.",
  IDEMPOTENCY_KEY_REUSED: "Khóa chống trùng đã được dùng cho một điểm ghé khác.",
  IDEMPOTENCY_ORDER_MISSING: "Không thể khôi phục đơn hàng đã gửi trước đó.",
};

export function routeApiError(error: unknown) {
  const code = error instanceof Error ? error.message : "ROUTE_OPERATION_FAILED";
  if (code.includes("ALREADY_EXISTS")) {
    return NextResponse.json(
      { error: "Chuyến cho tuyến và ngày này đã tồn tại.", code: "ROUTE_RUN_EXISTS" },
      { status: 409 },
    );
  }
  console.error("Field route operation failed:", error);
  return NextResponse.json(
    {
      error: ERROR_MESSAGES[code] ?? "Không thể hoàn tất thao tác đi tuyến.",
      code,
    },
    { status: ERROR_STATUS[code] ?? 500 },
  );
}
