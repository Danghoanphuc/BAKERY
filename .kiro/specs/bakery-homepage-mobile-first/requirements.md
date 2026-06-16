# Requirements Document

## Introduction

Hệ thống Trang Chủ Web App Đặt Bánh là một ứng dụng web thiết kế theo mô hình Mobile-first, cho phép người dùng duyệt, tìm kiếm và đặt mua các sản phẩm bánh với trải nghiệm nhanh chóng và trực quan. Giao diện lấy cảm hứng từ các ứng dụng giao đồ ăn phổ biến như GrabFood/ShopeeFood nhưng được tùy biến cho ngành F&B Bakery.

## Glossary

- **Homepage**: Trang chủ của ứng dụng web đặt bánh
- **User**: Người dùng cuối sử dụng ứng dụng để đặt bánh
- **Cart**: Giỏ hàng chứa các sản phẩm người dùng đã chọn
- **Product**: Sản phẩm bánh có thể đặt mua
- **Category**: Danh mục phân loại sản phẩm (bánh sinh nhật, bánh mì ngọt, bánh lạnh...)
- **Delivery_Mode**: Phương thức giao hàng (Giao tận nơi hoặc Đến cửa hàng lấy)
- **Order_Timing**: Thời gian nhận hàng (Giao ngay hoặc Đặt trước)
- **Header**: Thanh tiêu đề phía trên cùng của trang
- **Search_Bar**: Thanh tìm kiếm sản phẩm
- **Promo_Banner**: Banner quảng cáo khuyến mãi
- **Category_Grid**: Lưới hiển thị các danh mục sản phẩm
- **Product_Collection**: Danh sách sản phẩm theo chủ đề cụ thể
- **Sticky_Cart**: Thanh giỏ hàng luôn hiển thị ở dưới cùng màn hình
- **Modal**: Cửa sổ bật lên hiển thị nội dung bổ sung

## Requirements

### Requirement 1: Header Sticky với Thông Tin Đơn Hàng

**User Story:** Là một User, tôi muốn xem và điều chỉnh thời gian nhận hàng và địa chỉ giao hàng từ Header, để tôi có thể kiểm soát thông tin đơn hàng mà không cần cuộn trang.

#### Acceptance Criteria

1. THE Header SHALL remain fixed at the top of the viewport when the User scrolls
2. THE Header SHALL display the current Order_Timing selection
3. THE Header SHALL display the current delivery address
4. WHEN the User clicks on the Order_Timing selector, THE Homepage SHALL display a Modal with options for "Giao ngay" and "Đặt trước"
5. WHEN the User selects "Đặt trước" in the Order_Timing Modal, THE Homepage SHALL display date and time picker controls
6. WHEN the User confirms a new Order_Timing, THE Header SHALL update to display the selected timing

### Requirement 2: Search Bar cho Sản Phẩm

**User Story:** Là một User, tôi muốn tìm kiếm sản phẩm bánh nhanh chóng, để tôi có thể dễ dàng tìm thấy món bánh mình muốn.

#### Acceptance Criteria

1. THE Search_Bar SHALL be displayed prominently below the Header
2. THE Search_Bar SHALL display the placeholder text "Bạn muốn tìm bánh gì hôm nay?"
3. WHEN the User taps on the Search_Bar, THE Homepage SHALL navigate to a search interface
4. THE Search_Bar SHALL be sized at least 48 pixels in height for touch accessibility

### Requirement 3: Promo Banner Hiển Thị Khuyến Mãi

**User Story:** Là một User, tôi muốn thấy các chương trình khuyến mãi hiện tại, để tôi có thể tận dụng ưu đãi khi đặt hàng.

#### Acceptance Criteria

1. THE Promo_Banner SHALL be displayed below the Search_Bar
2. THE Promo_Banner SHALL display promotional content with title and description
3. THE Promo_Banner SHALL be visually distinct with prominent styling
4. WHEN the User taps on the Promo_Banner, THE Homepage SHALL navigate to the promotion details page

### Requirement 4: Delivery Mode Toggle

**User Story:** Là một User, tôi muốn chuyển đổi giữa "Giao tận nơi" và "Đến cửa hàng lấy", để tôi có thể chọn phương thức nhận hàng phù hợp.

#### Acceptance Criteria

1. THE Homepage SHALL display a Delivery_Mode toggle below the Promo_Banner
2. THE Delivery_Mode toggle SHALL present two options: "Giao tận nơi" and "Đến cửa hàng lấy"
3. THE Delivery_Mode toggle SHALL use a segmented control design pattern
4. WHEN the User selects a Delivery_Mode option, THE Homepage SHALL update the selected state visually
5. WHEN the User changes Delivery_Mode, THE Homepage SHALL persist the selection to the global state store
6. THE Delivery_Mode toggle SHALL be sized at least 48 pixels in height for touch accessibility

### Requirement 5: Category Grid Navigation

**User Story:** Là một User, tôi muốn duyệt các danh mục sản phẩm, để tôi có thể nhanh chóng tìm loại bánh mình quan tâm.

#### Acceptance Criteria

1. THE Category_Grid SHALL display below the Delivery_Mode toggle
2. THE Category_Grid SHALL arrange categories in a 4-column grid layout
3. THE Category_Grid SHALL display at least 8 categories including "Bánh sinh nhật", "Bánh mì ngọt", "Bánh lạnh", "Phụ kiện", and "Đồ uống"
4. THE Category_Grid SHALL display each category with an icon and label
5. WHEN the User taps on a Category, THE Homepage SHALL navigate to the category products page
6. THE Category_Grid SHALL be optimized for mobile viewport widths

### Requirement 6: Product Collections với Cuộn Ngang

**User Story:** Là một User, tôi muốn xem các sản phẩm được gợi ý và phổ biến, để tôi có thể khám phá và đặt mua bánh dễ dàng.

#### Acceptance Criteria

1. THE Homepage SHALL display multiple Product_Collection sections below the Category_Grid
2. THE Homepage SHALL include Product_Collection sections titled "Gợi ý cho bạn", "Mới ra lò sáng nay", and "Bán chạy nhất"
3. THE Product_Collection SHALL display products in a horizontally scrollable list
4. THE Product_Collection SHALL display each Product with image, name, price, and an "Add to Cart" button
5. WHEN the User scrolls a Product_Collection horizontally, THE Homepage SHALL allow smooth continuous scrolling
6. WHEN the User taps the "Add to Cart" button on a Product, THE Homepage SHALL add the Product to the Cart
7. WHEN a Product is added to Cart, THE Sticky_Cart SHALL update to reflect the new cart state

### Requirement 7: Sticky Cart Display

**User Story:** Là một User, tôi muốn luôn thấy tổng số lượng và giá trị giỏ hàng của mình, để tôi có thể theo dõi đơn hàng trong khi duyệt sản phẩm.

#### Acceptance Criteria

1. THE Sticky_Cart SHALL remain fixed at the bottom of the viewport when the User scrolls
2. THE Sticky_Cart SHALL display the total quantity of items in the Cart
3. THE Sticky_Cart SHALL display the total price of all items in the Cart
4. THE Sticky_Cart SHALL display a "Xem giỏ hàng" button
5. WHEN the Cart is empty, THE Sticky_Cart SHALL not be displayed
6. WHEN the Cart contains at least one item, THE Sticky_Cart SHALL be displayed
7. WHEN the User taps the "Xem giỏ hàng" button, THE Homepage SHALL navigate to the cart page

### Requirement 8: TypeScript Type Safety

**User Story:** Là một Developer, tôi muốn tất cả các data structures được định nghĩa rõ ràng với TypeScript, để tôi có thể phát hiện lỗi sớm và duy trì code dễ dàng.

#### Acceptance Criteria

1. THE Homepage SHALL define TypeScript interfaces for Product including fields: id, name, price, imageUrl, and categoryId
2. THE Homepage SHALL define TypeScript interfaces for Category including fields: id, name, and iconUrl
3. THE Homepage SHALL define TypeScript interfaces for CartItem including fields: productId, quantity, and price
4. THE Homepage SHALL enable TypeScript strict mode in the configuration
5. THE Homepage SHALL not contain any explicit "any" types in component props or state definitions

### Requirement 9: Modular Architecture

**User Story:** Là một Developer, tôi muốn code được tổ chức theo cấu trúc modular và feature-based, để tôi có thể dễ dàng maintain và mở rộng ứng dụng.

#### Acceptance Criteria

1. THE Homepage SHALL organize common UI components in src/components/common/ directory
2. THE Homepage SHALL organize layout components in src/components/layout/ directory including Header, Footer, and BottomNavigation
3. THE Homepage SHALL organize home-specific components in src/features/home/ directory including Banner, CategoryList, and ProductSlider
4. THE Homepage SHALL organize global state management in src/store/ directory including CartStore and OrderConfigStore
5. THE Homepage SHALL organize TypeScript type definitions in src/types/ directory
6. THE Homepage SHALL place each component in its own directory with a .tsx file and an index.ts barrel export

### Requirement 10: State Management với Zustand hoặc Redux Toolkit

**User Story:** Là một Developer, tôi muốn quản lý Cart và Delivery_Mode trong global state, để tôi có thể share state giữa các components một cách hiệu quả.

#### Acceptance Criteria

1. THE Homepage SHALL implement a CartStore for managing cart items using Zustand or Redux Toolkit
2. THE CartStore SHALL provide actions for adding items, removing items, and clearing the cart
3. THE Homepage SHALL implement an OrderConfigStore for managing Delivery_Mode and Order_Timing
4. THE OrderConfigStore SHALL provide actions for updating delivery mode and order timing
5. WHEN a component updates the CartStore, THE Sticky_Cart SHALL reflect the changes immediately
6. WHEN a component updates the OrderConfigStore, THE Header SHALL reflect the changes immediately

### Requirement 11: Mobile-First Responsive Design

**User Story:** Là một User trên thiết bị di động, tôi muốn giao diện được tối ưu cho màn hình điện thoại, để tôi có thể sử dụng ứng dụng dễ dàng trên thiết bị của mình.

#### Acceptance Criteria

1. THE Homepage SHALL be optimized for viewport widths from 320 pixels to 480 pixels as the primary design target
2. THE Homepage SHALL use touch-friendly interactive elements with minimum touch target size of 48 pixels
3. THE Homepage SHALL implement responsive layouts using Tailwind CSS breakpoint utilities
4. WHEN the viewport width exceeds 768 pixels, THE Homepage SHALL adapt the layout to utilize additional screen space
5. THE Homepage SHALL display all text with minimum font size of 16 pixels for body content to prevent browser zoom on mobile

### Requirement 12: Performance Optimization

**User Story:** Là một User, tôi muốn trang chủ tải nhanh và mượt mà, để tôi có thể bắt đầu đặt hàng ngay lập tức.

#### Acceptance Criteria

1. THE Homepage SHALL implement lazy loading for Product images
2. THE Homepage SHALL use Next.js Image component for automatic image optimization
3. THE Homepage SHALL implement code splitting for feature modules
4. WHEN the User scrolls to a Product_Collection, THE Homepage SHALL load product images only when they enter the viewport
5. THE Homepage SHALL achieve a Lighthouse performance score of at least 85 on mobile devices
