# Admin Refactor Guide

## Vấn đề hiện tại

- Tất cả logic, components, constants nằm trong 1 file page.tsx duy nhất
- File page.tsx từ 500-2000+ dòng code
- Khó bảo trì, khó test, khó tái sử dụng
- Không có tổ chức rõ ràng

## Cấu trúc mới (Đã áp dụng cho Orders)

```
orders/
├── page.tsx                    # Main component (< 200 dòng)
├── _components/                # UI Components
│   ├── OrderStats.tsx         # Thống kê đơn hàng
│   ├── OrderFilters.tsx       # Bộ lọc và tìm kiếm
│   ├── BulkActions.tsx        # Thao tác hàng loạt
│   ├── OrderTable.tsx         # Bảng đơn hàng (TODO)
│   └── OrderDetailModal.tsx   # Modal chi tiết (TODO)
├── _hooks/                     # Custom hooks
│   └── useOrders.ts           # Logic quản lý state orders
├── _lib/                       # Utilities & Constants
│   ├── constants.ts           # Constants, enums, labels
│   ├── order-utils.ts         # Helper functions
│   └── print-utils.ts         # Print functionality
└── _api/                       # API calls
    └── orderApi.ts            # Order API functions
```

## Nguyên tắc refactor

### 1. Tách constants

- Tất cả constants, enums, labels → `_lib/constants.ts`
- Dễ quản lý, dễ thay đổi

### 2. Tách utilities

- Helper functions, formatters → `_lib/*-utils.ts`
- Pure functions, dễ test

### 3. Tách API calls

- Tất cả fetch calls → `_api/*.ts`
- Centralized error handling
- Dễ mock cho testing

### 4. Custom hooks

- Logic state management → `_hooks/use*.ts`
- Reusable logic
- Tách biệt business logic khỏi UI

### 5. UI Components

- Mỗi component 1 file
- Single responsibility
- Props interface rõ ràng

## Lợi ích

✅ **Dễ bảo trì**: Mỗi file có trách nhiệm rõ ràng
✅ **Dễ test**: Pure functions, isolated components
✅ **Tái sử dụng**: Components và hooks có thể dùng lại
✅ **Dễ đọc**: File nhỏ gọn, logic rõ ràng
✅ **Team work**: Nhiều người làm việc song song
✅ **Type safety**: TypeScript types tốt hơn

## Tiến độ refactor

### ✅ Orders (Đang thực hiện)

- [x] `_lib/constants.ts`
- [x] `_lib/order-utils.ts`
- [x] `_lib/print-utils.ts`
- [x] `_hooks/useOrders.ts`
- [x] `_api/orderApi.ts`
- [x] `_components/OrderStats.tsx`
- [x] `_components/OrderFilters.tsx`
- [x] `_components/BulkActions.tsx`
- [ ] `_components/OrderTable.tsx` (TODO)
- [ ] `_components/OrderDetailModal.tsx` (TODO)
- [ ] `page.tsx` hoàn chỉnh (TODO)

### ⏳ Marketing (Chưa bắt đầu)

- [ ] Tương tự cấu trúc Orders

### ⏳ Customers (Chưa bắt đầu)

- [ ] Tương tự cấu trúc Orders

### ⏳ Categories (Chưa bắt đầu)

- [ ] Tương tự cấu trúc Orders

### ✅ Vouchers (Đơn giản - không cần refactor)

- File nhỏ, đã sạch

## Kế hoạch tiếp theo

1. Hoàn thiện Orders page
   - Tạo OrderTable component
   - Tạo OrderDetailModal component
   - Finalize page.tsx mới
   - Test kỹ

2. Áp dụng pattern cho Marketing
3. Áp dụng pattern cho Customers
4. Áp dụng pattern cho Categories

## Testing sau refactor

Cần test:

- [ ] Load orders thành công
- [ ] Filter hoạt động đúng
- [ ] Bulk actions hoạt động
- [ ] Update order thành công
- [ ] Print order hoạt động
- [ ] Modal mở đóng đúng
- [ ] Error handling đúng

## Notes

- Giữ nguyên logic nghiệp vụ
- Không thay đổi API calls
- Không thay đổi UI/UX
- Focus vào cấu trúc code
- Đảm bảo backward compatible
