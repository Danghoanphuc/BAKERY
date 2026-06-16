# Implementation Plan: Bakery Homepage Mobile-First

## Overview

This implementation plan covers building a mobile-first bakery homepage using Next.js 14+, React 18+, TypeScript (strict mode), Tailwind CSS, and Zustand for state management. The application provides an intuitive, touch-optimized interface for browsing bakery products with delivery/pickup options, inspired by modern F&B delivery platforms.

The implementation follows a progressive approach: set up core infrastructure, build layout components, implement feature-specific components, add state management, and finally integrate everything with testing throughout.

## Tasks

- [x] 1. Set up Next.js project with TypeScript and Tailwind CSS
  - Initialize Next.js 14+ project with App Router
  - Configure TypeScript strict mode with proper compiler options
  - Install and configure Tailwind CSS 3+ with mobile-first breakpoints
  - Set up project folder structure (src/app, src/components, src/features, src/store, src/types, src/lib)
  - Configure custom Tailwind colors for primary, accent, and neutral palettes
  - Install core dependencies: Zustand, clsx, next/image
  - _Requirements: 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 2. Define TypeScript type definitions
  - [x] 2.1 Create type definitions in src/types/
    - Create src/types/product.ts with Product interface (id, name, price, imageUrl, categoryId, description, availableForDelivery, availableForPickup)
    - Create src/types/category.ts with Category interface (id, name, iconUrl, displayOrder)
    - Create src/types/cart.ts with CartItem interface (productId, quantity, price, product)
    - Create src/types/orderConfig.ts with OrderConfig, OrderTiming, DeliveryMode types
    - Ensure all types use strict TypeScript with no "any" types
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 3. Implement Zustand state stores
  - [x] 3.1 Create CartStore with persistence
    - Create src/store/cartStore.ts
    - Implement CartState interface with items, addItem, removeItem, updateQuantity, clearCart actions
    - Add computed properties: totalQuantity, totalPrice
    - Configure Zustand persist middleware with localStorage ("bakery-cart-storage")
    - Implement error handling for localStorage quota exceeded
    - Handle optimistic updates with rollback on failure
    - _Requirements: 10.1, 10.2, 10.5_
  - [ ]\* 3.2 Write unit tests for CartStore
    - Test adding item to empty cart
    - Test incrementing quantity for existing item
    - Test removing item from cart
    - Test total price calculation
    - Test cart persistence and rehydration
    - _Requirements: 10.1, 10.2_
  - [x] 3.3 Create OrderConfigStore with persistence
    - Create src/store/orderConfigStore.ts
    - Implement OrderConfigState interface with config, setDeliveryMode, setOrderTiming, setDeliveryAddress actions
    - Configure Zustand persist middleware with localStorage ("bakery-order-config-storage")
    - Set default values: deliveryMode="delivery", orderTiming.type="now"
    - _Requirements: 10.3, 10.4, 10.6_
  - [x]\* 3.4 Write unit tests for OrderConfigStore
    - Test setting delivery mode
    - Test setting order timing (now vs scheduled)
    - Test setting delivery address
    - Test state persistence and rehydration
    - _Requirements: 10.3, 10.4_

- [x] 4. Build common UI components
  - [x] 4.1 Create Button component
    - Create src/components/common/Button/Button.tsx
    - Implement ButtonProps interface with variant (primary, outline, text), className, children, onClick, disabled
    - Style with minimum 48px height, touch-optimized padding
    - Implement variant styles (primary: bg-primary-500, outline: border-primary-500)
    - Add hover and active states with transition-colors
    - Create barrel export in index.ts
    - _Requirements: 11.2_
  - [x]\* 4.2 Write unit tests for Button component
    - Test rendering all variants
    - Test click handler invocation
    - Test disabled state
    - Test custom className application
    - _Requirements: 11.2_
  - [x] 4.3 Create Card component
    - Create src/components/common/Card/Card.tsx
    - Implement CardProps interface with children, className, onClick
    - Style with rounded corners, shadow, and padding
    - Add touch feedback with active:scale-98 transform
    - Create barrel export in index.ts
    - _Requirements: 11.2_
  - [x] 4.4 Create Modal component with bottom-sheet design
    - Create src/components/common/Modal/Modal.tsx
    - Implement ModalProps interface with isOpen, onClose, title, children, className
    - Use portal rendering for proper z-index layering
    - Implement backdrop with tap-to-close functionality
    - Add slide-up animation from bottom with smooth transition
    - Implement focus trap for accessibility
    - Add body scroll lock when modal is open
    - Support Escape key to close
    - _Requirements: 1.4_
  - [x]\* 4.5 Write unit tests for Modal component
    - Test modal opens and closes correctly
    - Test backdrop click closes modal
    - Test Escape key closes modal
    - Test focus trap functionality
    - _Requirements: 1.4_

- [x] 5. Checkpoint - Ensure core infrastructure is working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build Header component
  - [x] 6.1 Implement sticky Header with order info display
    - Create src/components/layout/Header/Header.tsx
    - Implement HeaderProps interface with className
    - Style with fixed positioning, 56px height, backdrop-blur background
    - Read orderTiming and deliveryAddress from useOrderConfigStore()
    - Display timing text (e.g., "Giao ngay" or formatted scheduled time)
    - Display address text (or default "Chọn địa chỉ giao hàng")
    - Add click handlers to open OrderTimingModal and AddressModal
    - Ensure Header remains visible during scroll with z-index layering
    - Create barrel export in index.ts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.6_
  - [x] 6.2 Implement OrderTimingModal
    - Create OrderTimingModal component within Header/
    - Display options: "Giao ngay" and "Đặt trước"
    - When "Đặt trước" selected, show date picker and time picker controls
    - Validate that scheduled date/time is at least 1 hour in the future
    - On confirm, call orderConfigStore.setOrderTiming()
    - Display inline error messages for validation failures
    - _Requirements: 1.4, 1.5, 1.6_
  - [ ]\* 6.3 Write integration tests for Header
    - Test Header displays current order timing from store
    - Test clicking timing opens OrderTimingModal
    - Test selecting "Giao ngay" updates store and Header display
    - Test selecting "Đặt trước" shows date/time pickers
    - Test validation for past date/time selection
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [x] 7. Build SearchBar component
  - [x] 7.1 Implement search navigation trigger
    - Create src/features/home/components/SearchBar/SearchBar.tsx
    - Implement SearchBarProps interface with placeholder, className
    - Style with minimum 48px height, search icon, rounded corners
    - Use readonly input with placeholder "Bạn muốn tìm bánh gì hôm nay?"
    - On tap/focus, use Next.js useRouter() to navigate to /search
    - Add touch-optimized padding and visual feedback
    - Create barrel export in index.ts
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]\* 7.2 Write unit tests for SearchBar
    - Test rendering with placeholder text
    - Test navigation to /search on click
    - Test minimum 48px height requirement
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Build PromoBanner component
  - [ ] 8.1 Implement promotional banner with navigation
    - Create src/features/home/components/PromoBanner/PromoBanner.tsx
    - Implement PromoBannerProps interface with title, description, imageUrl, href, className
    - Use Next.js Image component for optimized image loading
    - Wrap content in Next.js Link for navigation
    - Style with gradient overlay, shadow, and prominent visual design
    - Add touch feedback with active state styling
    - Create barrel export in index.ts
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]\* 8.2 Write unit tests for PromoBanner
    - Test rendering with title, description, and image
    - Test navigation on click
    - Test Next.js Image optimization
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 9. Build DeliveryModeToggle component
  - [x] 9.1 Implement segmented control for delivery mode
    - Create src/features/home/components/DeliveryModeToggle/DeliveryModeToggle.tsx
    - Implement DeliveryModeToggleProps interface with className
    - Display two options: "Giao tận nơi" and "Đến cửa hàng lấy"
    - Read deliveryMode from useOrderConfigStore()
    - On option click, call orderConfigStore.setDeliveryMode()
    - Style with segmented control design, sliding indicator for selected option
    - Ensure minimum 48px height for touch targets
    - Add visual feedback on selection (background color, text weight)
    - Create barrel export in index.ts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]\* 9.2 Write unit tests for DeliveryModeToggle
    - Test rendering both delivery options
    - Test updating store when option is selected
    - Test highlighting selected option
    - Test minimum 48px height requirement
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_

- [x] 10. Build CategoryGrid component
  - [x] 10.1 Implement category navigation grid
    - Create src/features/home/components/CategoryGrid/CategoryGrid.tsx
    - Implement CategoryGridProps interface with categories: Category[], className
    - Style with CSS Grid (grid-cols-4) for 4-column layout
    - Render each category with icon (Next.js Image) and label
    - Ensure each category card is minimum 48px touch target
    - Wrap each category in Next.js Link for navigation to /category/[id]
    - Optimize for mobile viewport widths (320px-480px)
    - Add touch feedback styling
    - Create barrel export in index.ts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]\* 10.2 Write unit tests for CategoryGrid
    - Test rendering 4-column grid layout
    - Test rendering category icons and labels
    - Test navigation to category page on click
    - Test touch target size requirements
    - _Requirements: 5.2, 5.4, 5.5_

- [x] 11. Build ProductCollection component
  - [x] 11.1 Implement horizontal scrollable product list
    - Create src/features/home/components/ProductCollection/ProductCollection.tsx
    - Implement ProductCollectionProps interface with title, products: Product[], onAddToCart, className
    - Display section title
    - Render products in horizontally scrollable container with overflow-x-auto
    - Implement CSS scroll-snap for smooth snapping between products
    - Style scrollbar to be minimal or hidden on mobile
    - Create barrel export in index.ts
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 11.2 Create ProductCard sub-component
    - Create ProductCard component within ProductCollection/
    - Implement ProductCardProps interface with product: Product, onAddToCart
    - Display product image (Next.js Image with lazy loading)
    - Display product name, price formatted in VND
    - Display "Thêm" button with minimum 48px touch target
    - On "Thêm" button click, call onAddToCart callback
    - Add loading placeholder for image during lazy load
    - Implement fallback image on 404
    - _Requirements: 6.4, 6.6, 12.1, 12.4_
  - [ ]\* 11.3 Write integration tests for ProductCollection
    - Test rendering product collection with title
    - Test horizontal scroll functionality
    - Test adding product to cart via button click
    - Test lazy loading of product images
    - Test scroll snap behavior
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 12.4_

- [x] 12. Build StickyCart component
  - [ ] 12.1 Implement fixed bottom cart summary
    - Create src/components/layout/StickyCart/StickyCart.tsx
    - Implement StickyCartProps interface with className
    - Read totalQuantity and totalPrice from useCartStore()
    - Style with fixed bottom positioning, safe area insets for iOS
    - Display total quantity (e.g., "3 món")
    - Display total price formatted in VND
    - Display "Xem giỏ hàng" button
    - Conditionally render only when totalQuantity > 0
    - Add smooth slide-up animation on mount
    - On button click, navigate to /cart using Next.js useRouter()
    - Create barrel export in index.ts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [ ]\* 12.2 Write integration tests for StickyCart
    - Test StickyCart hidden when cart is empty
    - Test StickyCart displays when cart has items
    - Test displaying correct quantity and price
    - Test navigation to cart page on button click
    - _Requirements: 7.5, 7.6, 7.7_

- [ ] 13. Checkpoint - Ensure all components work independently
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Create Homepage layout and integration
  - [ ] 14.1 Implement app/layout.tsx root layout
    - Create src/app/layout.tsx
    - Add html and body tags with lang="vi"
    - Import and apply Tailwind CSS globals
    - Set up viewport meta tag for mobile optimization
    - Configure font loading (if custom fonts used)
    - _Requirements: 11.1, 11.5_
  - [x] 14.2 Implement app/page.tsx homepage
    - Create src/app/page.tsx as Server Component
    - Fetch categories and featured products server-side (mock data or API)
    - Render component tree: Header, SearchBar, PromoBanner, DeliveryModeToggle, CategoryGrid, ProductCollection sections, StickyCart
    - Create multiple ProductCollection sections: "Gợi ý cho bạn", "Mới ra lò sáng nay", "Bán chạy nhất"
    - Pass mock promo banner data
    - Implement proper spacing between sections (16px-24px)
    - Ensure mobile-first responsive layout
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2, 7.1, 11.1_
  - [x] 14.3 Wire ProductCollection to CartStore
    - In ProductCollection, implement onAddToCart callback that calls cartStore.addItem()
    - Ensure adding product triggers StickyCart to appear
    - Verify cart state updates propagate to StickyCart display
    - Add toast notification on successful add to cart (optional enhancement)
    - _Requirements: 6.6, 6.7, 10.5_
  - [ ]\* 14.4 Write end-to-end tests for homepage integration
    - Test complete user flow: browse products → add to cart → view sticky cart
    - Test changing delivery mode updates across components
    - Test header displays and updates order timing
    - Test search bar navigates to search page
    - Test category grid navigates to category pages
    - _Requirements: 1.1, 2.3, 4.4, 5.5, 6.6, 6.7, 7.7_

- [-] 15. Implement performance optimizations
  - [ ] 15.1 Configure Next.js Image optimization
    - Set up next.config.js with image domains for external product images
    - Add priority prop to above-the-fold images (promo banner)
    - Implement lazy loading for ProductCollection images
    - Define explicit width and height for all images to prevent CLS
    - Configure WebP format with JPEG fallback
    - _Requirements: 12.1, 12.2, 12.5_
  - [ ] 15.2 Implement code splitting and lazy loading
    - Dynamically import Modal components with next/dynamic
    - Implement route-based code splitting (already handled by App Router)
    - Add loading.tsx for Suspense boundaries
    - Verify bundle size is optimized with tree-shaking
    - _Requirements: 12.3_
  - [ ]\* 15.3 Performance testing and validation
    - Run Lighthouse audit on mobile device simulation
    - Verify performance score ≥85
    - Test on real mobile devices (iOS and Android)
    - Check Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
    - _Requirements: 12.5_

- [ ] 16. Implement accessibility features
  - [ ] 16.1 Add ARIA labels and semantic HTML
    - Add aria-label to icon-only buttons
    - Use semantic HTML tags (header, main, nav, section)
    - Add skip-to-content link for keyboard users
    - Implement focus trap in Modal component
    - Ensure all form inputs have associated labels
    - _Requirements: 11.2_
  - [ ] 16.2 Add keyboard navigation support
    - Ensure all interactive elements are keyboard accessible (Tab navigation)
    - Add visible focus indicators to all focusable elements
    - Support Escape key to close modals
    - Test navigation flow with keyboard only
    - _Requirements: 11.2_
  - [ ]\* 16.3 Run accessibility audit
    - Use @axe-core/react for automated accessibility testing
    - Verify WCAG 2.1 Level AA compliance
    - Test with screen reader (VoiceOver or NVDA)
    - Check color contrast ratios (4.5:1 for text, 3:1 for large text)
    - _Requirements: 11.2_

- [ ] 17. Add error boundaries and error handling
  - [ ] 17.1 Create error boundary components
    - Create src/components/common/ErrorBoundary.tsx
    - Implement componentDidCatch lifecycle
    - Create fallback UI for component errors
    - Wrap ProductCollection and CategoryGrid with ErrorBoundary
    - Create global error boundary in app/layout.tsx
    - _Requirements: 8.4_
  - [ ] 17.2 Implement network error handling
    - Add loading states with skeleton loaders for data fetching
    - Display retry button on fetch failures
    - Implement toast notifications for cart operation failures
    - Add fallback images for product image load failures
    - Handle localStorage quota exceeded gracefully
    - _Requirements: 12.1_

- [ ] 18. Final checkpoint and integration verification
  - [ ] 18.1 Run complete test suite
    - Run all unit tests (vitest)
    - Run all integration tests
    - Run all E2E tests (playwright)
    - Verify all tests pass
    - Check test coverage meets 80% minimum
  - [ ] 18.2 Cross-browser and device testing
    - Test on Chrome mobile (Android)
    - Test on Safari mobile (iOS)
    - Test on viewport widths: 320px, 375px, 414px, 480px, 768px
    - Verify touch interactions work correctly
    - Verify sticky elements (Header, StickyCart) behave correctly on scroll
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [ ] 18.3 Final verification checklist
    - Verify TypeScript strict mode enabled with no "any" types
    - Verify all requirements mapped to implementation
    - Verify folder structure follows modular architecture
    - Verify state persistence works (reload page, state retained)
    - Verify performance score ≥85 on mobile
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.5, 10.6, 12.5_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task explicitly references requirements for traceability
- The implementation follows a bottom-up approach: infrastructure → components → integration → optimization
- Testing is integrated throughout with checkpoints to ensure quality at each phase
- TypeScript strict mode and type safety are enforced from the start
- Mobile-first design is prioritized with 320px-480px as primary target, then enhanced for larger screens
- State management with Zustand provides lightweight, simple API with built-in persistence
- Performance optimization is built in from the beginning (lazy loading, image optimization, code splitting)
- Accessibility is a first-class concern with ARIA labels, keyboard navigation, and WCAG compliance

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.3"] },
    { "id": 3, "tasks": ["3.2", "3.4", "4.1", "4.3", "4.4"] },
    { "id": 4, "tasks": ["4.2", "4.5", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1", "8.1", "9.1"] },
    { "id": 6, "tasks": ["6.3", "7.2", "8.2", "9.2", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1"] },
    { "id": 8, "tasks": ["11.2"] },
    { "id": 9, "tasks": ["11.3", "12.1"] },
    { "id": 10, "tasks": ["12.2", "14.1"] },
    { "id": 11, "tasks": ["14.2"] },
    { "id": 12, "tasks": ["14.3"] },
    {
      "id": 13,
      "tasks": ["14.4", "15.1", "15.2", "16.1", "16.2", "17.1", "17.2"]
    },
    { "id": 14, "tasks": ["15.3", "16.3", "18.1"] },
    { "id": 15, "tasks": ["18.2"] },
    { "id": 16, "tasks": ["18.3"] }
  ]
}
```
