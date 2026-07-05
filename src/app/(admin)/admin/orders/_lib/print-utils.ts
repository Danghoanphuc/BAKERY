import type { Order } from "@/types";
import { formatDateTime, formatPrice } from "./order-utils";
import { orderTypeLabel, paymentLabels } from "./constants";

export function buildPrintableOrder(order: Order): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Đơn hàng ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .header h1 { font-size: 20px; margin-bottom: 4px; }
    .section { margin: 16px 0; }
    .section-title { font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
    .info-label { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 8px 4px; text-align: left; border-bottom: 1px solid #ddd; }
    th { font-weight: bold; background: #f5f5f5; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; font-size: 14px; border-top: 2px solid #000; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BAKERY</h1>
    <div>Phiếu đơn hàng</div>
  </div>

  <div class="section">
    <div class="info-row">
      <span class="info-label">Mã đơn:</span>
      <span>${order.orderNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Thời gian:</span>
      <span>${formatDateTime(order.createdAt)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Loại đơn:</span>
      <span>${orderTypeLabel[order.orderType]}</span>
    </div>
    ${
      order.pickupTime
        ? `
    <div class="info-row">
      <span class="info-label">Giờ hẹn:</span>
      <span>${formatDateTime(order.pickupTime)}</span>
    </div>
    `
        : ""
    }
  </div>

  <div class="section">
    <div class="section-title">Khách hàng</div>
    <div class="info-row">
      <span class="info-label">Tên:</span>
      <span>${order.customerName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">SĐT:</span>
      <span>${order.customerPhone}</span>
    </div>
    ${
      order.customerEmail
        ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span>${order.customerEmail}</span>
    </div>
    `
        : ""
    }
    ${
      order.deliveryAddress
        ? `
    <div class="info-row">
      <span class="info-label">Địa chỉ:</span>
      <span>${order.deliveryAddress}</span>
    </div>
    `
        : ""
    }
    ${
      order.notes
        ? `
    <div class="info-row">
      <span class="info-label">Ghi chú:</span>
      <span>${order.notes}</span>
    </div>
    `
        : ""
    }
  </div>

  <div class="section">
    <div class="section-title">Sản phẩm</div>
    <table>
      <thead>
        <tr>
          <th>Tên sản phẩm</th>
          <th class="text-right">SL</th>
          <th class="text-right">Đơn giá</th>
          <th class="text-right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td>
              ${item.productName}
              ${item.selectedSize ? `<br><small>Size: ${item.selectedSize}</small>` : ""}
              ${item.selectedFlavor ? `<br><small>Vị: ${item.selectedFlavor}</small>` : ""}
              ${item.customMessage ? `<br><small>Tin nhắn: ${item.customMessage}</small>` : ""}
              ${item.candles ? `<br><small>${item.candles} nến</small>` : ""}
            </td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatPrice(item.price)}</td>
            <td class="text-right">${formatPrice(item.price * item.quantity)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="info-row">
      <span>Tạm tính:</span>
      <span>${formatPrice(order.totalAmount - (order.deliveryFee || 0))}</span>
    </div>
    ${
      order.deliveryFee
        ? `
    <div class="info-row">
      <span>Phí giao hàng:</span>
      <span>${formatPrice(order.deliveryFee)}</span>
    </div>
    `
        : ""
    }
    ${
      order.discountAmount
        ? `
    <div class="info-row">
      <span>Giảm giá:</span>
      <span>-${formatPrice(order.discountAmount)}</span>
    </div>
    `
        : ""
    }
    <div class="info-row total-row">
      <span>Tổng cộng:</span>
      <span>${formatPrice(order.totalAmount)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Thanh toán:</span>
      <span>${paymentLabels[order.paymentStatus || "unpaid"]}</span>
    </div>
  </div>

  ${
    order.internalNotes
      ? `
  <div class="section">
    <div class="section-title">Ghi chú nội bộ</div>
    <div>${order.internalNotes}</div>
  </div>
  `
      : ""
  }

  <div class="footer">
    Cảm ơn quý khách đã ủng hộ!
  </div>
</body>
</html>
  `.trim();
}
