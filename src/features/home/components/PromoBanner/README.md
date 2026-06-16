# PromoBanner Component

A promotional banner component for displaying marketing content with navigation functionality.

## Features

- Next.js optimized image loading with `next/image`
- Navigation support using `next/link`
- Gradient overlay for text readability
- Touch-optimized interaction with active state feedback
- Prominent visual design with shadow effects
- Accessibility support with proper ARIA labels
- Mobile-first responsive design

## Usage

```tsx
import { PromoBanner } from "@/features/home/components/PromoBanner";

function HomePage() {
  return (
    <PromoBanner
      title="Khuyến mãi đặc biệt"
      description="Giảm giá 30% cho tất cả bánh ngọt trong tuần này"
      imageUrl="/images/promo-banner.jpg"
      href="/promotions/special-offer"
      className="mb-4"
    />
  );
}
```

## Props

- `title` (string): The promotional title text
- `description` (string): The promotional description text
- `imageUrl` (string): URL for the background image
- `href` (string): Navigation destination URL
- `className` (optional string): Additional CSS classes

## Requirements Addressed

- **3.1**: Displays below the Search_Bar
- **3.2**: Shows promotional content with title and description
- **3.3**: Visually distinct with prominent styling (gradient, shadow)
- **3.4**: Navigates to promotion details page when tapped
