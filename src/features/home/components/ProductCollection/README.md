# ProductCollection Component

A horizontally scrollable product list component for displaying bakery products with touch-optimized interactions.

## Features

- **Horizontal Scrolling**: Products display in a horizontally scrollable container with CSS scroll-snap for smooth navigation
- **Mobile-First Design**: Optimized for touch interactions with 48px minimum touch targets
- **Lazy Loading**: Product images load lazily for performance optimization
- **Responsive Images**: Uses Next.js Image component with automatic optimization
- **Fallback Handling**: Shows loading placeholder and fallback image on 404
- **VND Currency Formatting**: Displays prices in Vietnamese Dong format

## Usage

### Basic Example

```tsx
import { ProductCollection } from "@/features/home/components";
import { useCartStore } from "@/store";

const products: Product[] = [
  {
    id: "1",
    name: "Bánh mì hamburger",
    price: 25000,
    imageUrl: "/images/burger-bread.jpg",
    categoryId: "bread",
  },
  // ... more products
];

export function HomePage() {
  const { addItem } = useCartStore();

  return (
    <ProductCollection
      title="Gợi ý cho bạn"
      products={products}
      onAddToCart={addItem}
    />
  );
}
```

### Multiple Collections

```tsx
export function HomePage() {
  const { addItem } = useCartStore();

  return (
    <div className="space-y-6">
      <ProductCollection
        title="Gợi ý cho bạn"
        products={recommendedProducts}
        onAddToCart={addItem}
      />

      <ProductCollection
        title="Mới ra lò sáng nay"
        products={freshProducts}
        onAddToCart={addItem}
      />

      <ProductCollection
        title="Bán chạy nhất"
        products={bestSellingProducts}
        onAddToCart={addItem}
      />
    </div>
  );
}
```

## Props

### ProductCollectionProps

| Prop          | Type                         | Required | Description                                      |
| ------------- | ---------------------------- | -------- | ------------------------------------------------ |
| `title`       | `string`                     | ✅       | Section title displayed above the product list   |
| `products`    | `Product[]`                  | ✅       | Array of products to display                     |
| `onAddToCart` | `(product: Product) => void` | ✅       | Callback function when user clicks "Thêm" button |
| `className`   | `string`                     | ❌       | Additional CSS classes for the container         |

### ProductCardProps

| Prop          | Type                         | Required | Description                                      |
| ------------- | ---------------------------- | -------- | ------------------------------------------------ |
| `product`     | `Product`                    | ✅       | Product data to display                          |
| `onAddToCart` | `(product: Product) => void` | ✅       | Callback function when user clicks "Thêm" button |

## Requirements Covered

✅ **Requirement 6.1**: Multiple Product_Collection sections displayed below Category_Grid  
✅ **Requirement 6.2**: Sections titled "Gợi ý cho bạn", "Mới ra lò sáng nay", "Bán chạy nhất"  
✅ **Requirement 6.3**: Products displayed in horizontally scrollable list  
✅ **Requirement 6.4**: Each Product shows image, name, price, and "Add to Cart" button  
✅ **Requirement 6.5**: Smooth continuous horizontal scrolling with CSS scroll-snap  
✅ **Requirement 6.6**: Add to Cart functionality updates global cart state  
✅ **Requirement 12.1**: Lazy loading for product images  
✅ **Requirement 12.4**: Next.js Image component for optimization

## Implementation Notes

### Scroll Behavior

- Uses `overflow-x-auto` for horizontal scrolling
- CSS `scroll-snap-type: x mandatory` for smooth snapping
- Each product card has `scroll-snap-align: start`
- Hidden scrollbars on mobile for cleaner appearance

### Touch Optimization

- "Thêm" button meets 48x48px minimum touch target
- Visual feedback on button press with `active:scale-98`
- Proper spacing between interactive elements

### Performance

- Images load lazily using Next.js Image `loading="lazy"`
- Loading spinner displayed during image load
- Graceful fallback with icon on image error
- Fixed width (160px) per card prevents layout shift

### Accessibility

- Semantic HTML structure with proper headings
- Alt text for all product images
- Proper button labeling and keyboard navigation
- Focus indicators for interactive elements

## Testing

Run tests with:

```bash
npm test -- ProductCollection
```

The test suite covers:

- Component rendering and props
- User interactions (clicking "Thêm" button)
- Image loading states and error handling
- Currency formatting
- Touch target compliance
- Accessibility requirements
