# Common UI Components

This directory contains reusable UI components for the Bakery homepage application.

## Components

### Button Component

A touch-optimized button component with multiple variants.

**Features:**

- Minimum 48px height for touch accessibility
- Three variants: primary, outline, text
- Hover and active states with smooth transitions
- Focus ring for keyboard navigation
- Disabled state support
- Full TypeScript support

**Usage:**

```tsx
import { Button } from '@/components/common';

// Primary button (default)
<Button onClick={handleClick}>Add to Cart</Button>

// Outline variant
<Button variant="outline" onClick={handleClick}>Cancel</Button>

// Text variant
<Button variant="text" onClick={handleClick}>Learn More</Button>

// Disabled state
<Button disabled>Out of Stock</Button>
```

### Card Component

A flexible card component with optional interactivity and touch feedback.

**Features:**

- Rounded corners, shadow, and padding
- Optional click functionality
- Touch feedback with `active:scale-98` transform
- Keyboard navigation support
- Focus ring for accessibility
- Semantic HTML with proper ARIA attributes

**Usage:**

```tsx
import { Card } from '@/components/common';

// Static card
<Card>
  <h3>Product Name</h3>
  <p>Product description...</p>
</Card>

// Interactive card
<Card onClick={() => navigateToProduct(id)}>
  <h3>Clickable Product</h3>
  <p>Click to view details</p>
</Card>
```

### Modal Component

A bottom-sheet style modal component optimized for mobile interfaces.

**Features:**

- Portal rendering for proper z-index layering
- Backdrop with tap-to-close functionality
- Slide-up animation from bottom
- Focus trap for accessibility
- Body scroll lock when open
- Escape key support
- Touch-friendly design

**Usage:**

```tsx
import { Modal } from "@/components/common";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Order Details"
      >
        <div>
          <p>Modal content goes here...</p>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  );
}
```

## Design System

### Touch Targets

All interactive elements use the `touch-target` utility class ensuring minimum 48x48px touch targets for optimal mobile experience.

### Color Palette

- **Primary**: Red-based palette for main actions and branding
- **Accent**: Orange-based palette for secondary actions
- **Neutral**: Grayscale palette for text and backgrounds

### Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- Keyboard navigation support
- Focus indicators
- Screen reader compatibility
- Proper semantic HTML
- ARIA attributes where needed

## Testing

Each component includes comprehensive unit tests covering:

- Rendering behavior
- Interaction handling
- Accessibility features
- Edge cases and error states

Run tests with:

```bash
npm test
```

## TypeScript

All components are built with strict TypeScript:

- No `any` types
- Comprehensive prop interfaces
- Proper type exports
- IntelliSense support
