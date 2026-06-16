# BAKERY

Mobile-first bakery homepage web application built with Next.js, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3+
- **State Management**: Zustand
- **Image Optimization**: Next.js Image component

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles with Tailwind config
├── components/            # Reusable UI components
│   ├── common/           # Common components (Button, Card, Modal, etc.)
│   └── layout/           # Layout components (Header, Footer, etc.)
├── features/             # Feature-specific components
│   └── home/            # Homepage feature
│       ├── components/  # Home-specific components
│       └── hooks/       # Home-specific hooks
├── store/               # Zustand state management
│   ├── cartStore.ts     # Shopping cart state
│   └── orderConfigStore.ts # Order configuration state
├── types/               # TypeScript type definitions
│   ├── product.ts       # Product types
│   ├── category.ts      # Category types
│   └── cart.ts          # Cart and order types
└── lib/                 # Utility functions
    └── utils.ts         # Helper functions
```

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## Features

- ✅ Next.js 14+ with App Router
- ✅ TypeScript strict mode
- ✅ Tailwind CSS 3+ with custom color palette
- ✅ Mobile-first responsive design (320-480px primary target)
- ✅ Zustand for state management
- ✅ Image optimization with Next.js Image
- ✅ Touch-optimized UI (48px minimum touch targets)

## Custom Tailwind Colors

The project includes custom color palettes:

- **Primary**: Red tones for brand identity
- **Accent**: Orange tones for CTAs
- **Neutral**: Grayscale for text and backgrounds

## TypeScript Configuration

Strict mode is enabled with:

- No implicit any
- Strict null checks
- Strict function types
- No unused locals/parameters
- No fallthrough cases in switch

## State Management

### Cart Store

- Add/remove items
- Update quantities
- Calculate totals
- LocalStorage persistence

### Order Config Store

- Delivery mode (delivery/pickup)
- Order timing (now/scheduled)
- Delivery address
- LocalStorage persistence
