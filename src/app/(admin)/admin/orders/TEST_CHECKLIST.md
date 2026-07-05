# Orders Module - Test Checklist

## ✅ Build & Compile

- [ ] `npm run build` không có errors
- [ ] TypeScript không có type errors
- [ ] Chỉ có 1 warning nhỏ (setSelectedIds unused - safe to ignore)

## 🔄 Data Loading

- [ ] Trang load thành công
- [ ] Hiển thị loading state khi đang tải
- [ ] Hiển thị danh sách orders sau khi load
- [ ] Error message hiển thị nếu load thất bại
- [ ] Nút "Làm mới" hoạt động

## 📊 Stats Dashboard

- [ ] "Chờ xử lý" hiển thị đúng số lượng
- [ ] "Đang vận hành" hiển thị đúng
- [ ] "Quá hạn" hiển thị đúng (đỏ warning)
- [ ] "Sẵn sàng giao/lấy" hiển thị đúng
- [ ] "Hủy hôm nay" hiển thị đúng
- [ ] "Doanh thu hôm nay" format đúng VND

## 🔍 Filters

- [ ] Search box tìm kiếm theo mã đơn
- [ ] Search box tìm kiếm theo tên khách
- [ ] Search box tìm kiếm theo số điện thoại
- [ ] Filter "Tất cả trạng thái" hoạt động
- [ ] Filter theo từng trạng thái cụ thể
- [ ] Filter "Mọi thời gian" hoạt động
- [ ] Filter "Hôm nay" hiển thị đúng
- [ ] Filter "Sắp tới" hiển thị đúng
- [ ] Filter "Quá hạn" hiển thị đúng
- [ ] Counter "X đơn" hiển thị đúng số lượng

## 📑 Tabs

- [ ] Tab "Tất cả" hiển thị tất cả đơn
- [ ] Tab "Giao hàng" chỉ hiển thị delivery orders
- [ ] Tab "Đến lấy" chỉ hiển thị pickup orders
- [ ] Tab "Đặt trước" chỉ hiển thị preorders
- [ ] Active tab được highlight

## ☑️ Bulk Actions

- [ ] Checkbox "Select All" hoạt động
- [ ] Chọn từng order riêng lẻ
- [ ] Banner hiển thị "Đã chọn X đơn"
- [ ] Nút "Xác nhận" hoạt động
- [ ] Nút "Đang chuẩn bị" hoạt động
- [ ] Nút "Hoàn thành" hoạt động
- [ ] Nút "Bỏ chọn" clear selection
- [ ] Success message sau bulk update
- [ ] Error message nếu bulk update fails

## 📋 Orders Table

- [ ] Hiển thị đầy đủ columns
- [ ] Checkbox mỗi row hoạt động
- [ ] Mã đơn clickable
- [ ] Badge "Quá hạn" hiển thị đúng (đỏ)
- [ ] Tên khách & SĐT hiển thị
- [ ] Tổng tiền format VND đúng
- [ ] Loại đơn hiển thị đúng label
- [ ] Status badge màu đúng
- [ ] Payment status badge màu đúng
- [ ] Thời gian format đúng
- [ ] Giờ hẹn hiển thị (nếu có)
- [ ] Quick action buttons hoạt động
- [ ] Nút "Xem" mở modal

## 🔄 Status Updates

- [ ] Click quick action update status
- [ ] Loading state khi đang update
- [ ] Success message sau update
- [ ] Order status thay đổi trong table
- [ ] Badge color cập nhật
- [ ] Error message nếu update fails
- [ ] 409 error show message phù hợp

## 📱 Order Detail Modal

### Open/Close

- [ ] Click "Xem" mở modal
- [ ] Modal hiển thị đầy đủ thông tin
- [ ] Click X đóng modal
- [ ] Click outside đóng modal (nếu implement)

### Header

- [ ] Hiển thị order number
- [ ] Hiển thị tên khách & thời gian
- [ ] Nút "In phiếu" hoạt động
- [ ] Nút X đóng modal

### Luồng xử lý

- [ ] Hiển thị status badge hiện tại
- [ ] Chỉ show valid next steps
- [ ] Click status button update
- [ ] Disabled khi đang save
- [ ] "Đơn đã kết thúc" hiển thị đúng

### Sản phẩm

- [ ] List tất cả items
- [ ] Hiển thị ảnh sản phẩm
- [ ] Hiển thị tên sản phẩm
- [ ] Hiển thị options (size, flavor, etc.)
- [ ] Hiển thị số lượng
- [ ] Hiển thị đơn giá
- [ ] Hiển thị thành tiền
- [ ] Format VND đúng

### Timeline

- [ ] Hiển thị history items
- [ ] Icon & color đúng
- [ ] Timestamp format đúng
- [ ] Actor name hiển thị
- [ ] Notes hiển thị (nếu có)

### Thông tin khách

- [ ] Tên khách hàng
- [ ] Số điện thoại
- [ ] Email (nếu có)
- [ ] Loại đơn
- [ ] Địa chỉ giao (nếu có)
- [ ] Giờ hẹn (nếu có)
- [ ] Ghi chú khách (nếu có)

### Vận hành nội bộ Form

- [ ] Input "Nhân viên phụ trách" editable
- [ ] Dropdown "Thanh toán" hoạt động
- [ ] Textarea "Ghi chú nội bộ" editable
- [ ] Textarea "Lý do hủy" editable
- [ ] Nút "Lưu vận hành" hoạt động
- [ ] Loading state khi save
- [ ] Success message
- [ ] Data cập nhật sau save

### Tổng kết

- [ ] Tạm tính đúng
- [ ] Phí giao hàng (nếu có)
- [ ] Giảm giá (nếu có)
- [ ] Tổng cộng bold & highlight
- [ ] Format VND đúng

## 🖨️ Print Order

- [ ] Click "In phiếu" mở popup
- [ ] Popup hiển thị printable format
- [ ] Header có logo/tên cửa hàng
- [ ] Mã đơn hiển thị
- [ ] Thông tin khách đầy đủ
- [ ] Sản phẩm list đầy đủ
- [ ] Tổng tiền đúng
- [ ] Print dialog mở
- [ ] In thành công

## 🎨 UI/UX

- [ ] Responsive trên mobile
- [ ] Responsive trên tablet
- [ ] Hover effects hoạt động
- [ ] Loading spinners smooth
- [ ] Transitions smooth
- [ ] Colors consistent
- [ ] Typography consistent
- [ ] Spacing consistent
- [ ] No layout shift
- [ ] No console errors

## 🚨 Error Handling

- [ ] Network error hiển thị message
- [ ] 409 conflict hiển thị đúng message
- [ ] 404 handled gracefully
- [ ] 500 hiển thị generic error
- [ ] Retry có thể thực hiện
- [ ] Error không crash app

## ♿ Accessibility

- [ ] Keyboard navigation hoạt động
- [ ] Tab order hợp lý
- [ ] Focus visible
- [ ] ARIA labels đầy đủ
- [ ] Screen reader friendly (test cơ bản)

## 🔒 Edge Cases

- [ ] Empty state (no orders)
- [ ] 1 order only
- [ ] 100+ orders
- [ ] Order without pickupTime
- [ ] Order without email
- [ ] Order without notes
- [ ] Overdue orders highlighted
- [ ] Cancelled orders
- [ ] Completed orders

---

## ✅ Sign-off

**Tested by**: ******\_******
**Date**: ******\_******
**Issues found**: ******\_******
**Status**: ⬜ Pass | ⬜ Fail | ⬜ Needs fixes

---

## 🐛 Known Issues

- Warning: 'setSelectedIds' declared but not read (safe - used in hooks)

---

## 📝 Notes

Add any observations or issues here:
