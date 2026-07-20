# SweetTime design system

## Direction

SweetTime is a warm editorial bakery: crafted rather than cute, generous rather
than dense, and product-led rather than promotion-led. The storefront should feel
like a contemporary bakery catalogue while remaining fast enough for daily mobile
ordering. The admin keeps the same materials with a quieter, more utilitarian voice.

## Structural family

- Storefront: Catalogue + photographic product index.
- Product detail: Split Studio, image-led with a persistent purchase rail.
- Search and category: Index-first catalogue with compact filtering.
- Checkout and account: Long-document flow with clear progress and restrained cards.
- Admin: Workbench with dense tables, calm surfaces, and persistent navigation.

## Colour

- Paper: warm flour `oklch(97% 0.018 82)`.
- Surface: parchment `oklch(94% 0.025 78)` and white-cream `oklch(99% 0.008 82)`.
- Ink: cacao `oklch(27% 0.045 48)`.
- Accent: brick `oklch(54% 0.15 34)`; reserved for purchase, selection, and status.
- Secondary accent: toasted gold `oklch(67% 0.10 76)`.
- Success: herb `oklch(52% 0.08 145)`.

No colour is introduced directly inside a component. New values must become
semantic tokens in `src/app/globals.css` first.

## Typography

- Display: Fraunces, upright only, for page and section headlines.
- Body/UI: Be Vietnam Pro.
- Product names stay in the body family at 700–800 weight for compact scanning.
- Headings use sentence case. Uppercase is reserved for short utility labels.

## Shape and spacing

- 4px base spacing scale.
- Product imagery uses restrained 18–24px rounding; forms use 12–16px.
- Primary surfaces use hairline borders and very soft cacao shadows.
- Pill shapes are reserved for status, filters, and floating mobile navigation.

## Motion

- Transform and opacity only.
- 160ms micro, 240ms short, 420ms reveal.
- No bounce or celebratory motion. Reduced-motion collapses all spatial movement.

## Shared interaction contract

Interactive controls cover default, hover, focus-visible, active, disabled,
loading, error, and success where those states apply. Clickable labels never wrap.
Touch targets are at least 44px, preferably 48px on mobile.

## Responsive contract

- Storefront widths: 320, 375, 414, 768, 1024, 1280, and 1440px.
- Mobile keeps the bottom navigation and two-column product grid.
- Desktop opens into a true catalogue, with a 1200–1320px content measure.
- Both `html` and `body` use `overflow-x: clip`; horizontal carousels own their
  overflow explicitly.

## Implementation boundaries

- Preserve routes, data fetching, stores, analytics, and checkout behaviour.
- Preserve current uncommitted product configurator work.
- No production files or route trees are deleted as part of the redesign.
- Existing global styles are migrated incrementally; Tailwind entry directives stay.

## Hallmark implementation

- Genre: editorial commerce.
- Storefront macrostructure: Catalogue.
- Storefront component voice: F6 product grid, image · name · price · one action.
- App navigation: compact bottom rail on mobile; no glass blur or moving card-within-card.
- Storefront motion: static by default; only press feedback and image hover at 1.02×.
- Category labels stay on one line. Full category names remain available to assistive technology.

## Exports

- CSS custom properties: `tokens.css`.
- DTCG tokens: `tokens.json`.
- Tailwind v4 values are mapped through `src/app/globals.css`.
- shadcn-compatible roles map as follows: background → paper, foreground → ink,
  primary → accent, primary-foreground → accent-ink, border/input → rule,
  ring → focus, radius → radius-control.
