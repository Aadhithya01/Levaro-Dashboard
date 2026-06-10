# Customer Storefront Revamp — Design Spec

**Date:** 2026-06-10
**Status:** Approved direction (prototype validated); ready for planning

## Problem

The customer storefront works but feels safe — it does not "amaze." The
goal is a magazine-grade, editorial luxury experience that elevates LEVARO
to look genuinely professional and aesthetic, while keeping the brand
identity and every existing feature intact, and remaining fully responsive
(desktop + phone). All product/collection imagery must come from Supabase,
exactly as today.

## Scope

In scope: visual + interaction redesign of the two customer pages —
`CustomerShop.jsx` (collections landing) and `CustomerCategory.jsx`
(products in a collection) — plus a small admin addition to choose the hero
collection. Out of scope: admin mobile work (already shipped), the data
model beyond one new `categories.is_hero` flag, and any change to how
products/categories/reviews are created or stored.

## Validated Direction

A live prototype was built and approved. The aesthetic:

- **Canvas:** deep green (`#0c2c21`–`#1a5c45`) with a fine gold dot-grid and
  a subtle film-grain overlay for atmosphere (not flat color).
- **Type:** Cormorant (serif display, light weights, wide tracking) paired
  with Raleway (sans, uppercase micro-labels). Already the brand fonts.
- **Hero:** oversized `LEVARO` whose letters rise into place on load
  (staggered), an italic serif tagline with a gold hairline, and a framed
  hero photograph that reveals via clip-path wipe + slow zoom, marked
  `N° 01` in the corner.
- **Collections:** a "broken" magazine grid — tiles of varied sizes with
  index numbers (01, 02, …), hover image-zoom, a gold ring that draws in on
  hover, and an "Explore →" that slides in.
- **Marquee:** italic serif trust-words scrolling across a gold-ruled band.
- **Product cards:** cream cards on the green canvas — serif name, green
  price, star rating, low-stock/sold-out badges, and the Review button.
- **Micro-interactions:** custom gold cursor that swells over interactive
  elements (desktop, `hover:hover` only); topbar solidifies on scroll.
- **Responsive:** desktop multi-column broken grid → phone 2-column /
  featured-stack; nav collapses; custom cursor disabled on touch.

## Data & Dynamic Content

All content is Supabase-driven; the redesign is presentation-only over the
existing queries.

- **Imagery:** collection tiles use `categories.image_url`; product cards
  use `products.image_url` + `product_images` (existing `MediaSlider` and
  `ProductMediaModal` are reused unchanged). Items without an image render
  the existing monogram (first letter) tile, restyled to match.
- **Variable collection counts:** the broken grid uses a **repeating size
  pattern** (e.g. feature → small → small → wide → wide, then cycle) keyed
  off the tile index, so any number of collections (3 or 30) looks
  intentionally art-directed. The pattern is a pure function of index — no
  manual layout.
- **Hero collection (`is_hero`):**
  - New boolean column `categories.is_hero` (default `false`), added by a
    Supabase migration. At most one row is `true`.
  - Admin `Categories.jsx` gains a "Set as hero" toggle (star) on each card;
    selecting one sets it `true` and clears any previous hero in the same
    operation.
  - `CustomerShop` selects the hero collection's `image_url` for the framed
    hero photo. **Fallback order:** marked hero → newest collection with an
    image → deep-green gradient (no photo). The typographic `LEVARO` hero
    shows in all cases.

## Components

- **`CustomerShop.jsx`** — rebuilt landing: topbar, kinetic hero (hero image
  from `is_hero`), marquee, broken collections grid. Reuses
  `CustomerFooter`, `FloatingFeedbackButton`, `FloatingSuggestionButton`.
- **`CustomerCategory.jsx`** — rebuilt listing in the same language: slim
  editorial header (back to collections + wordmark), section heading with
  piece count, product cards on the green canvas. Reuses `MediaSlider`,
  `ProductMediaModal`, `ReviewModal`, and the badge/price logic unchanged.
- **New small shared pieces (extracted for clarity, customer-only):**
  - `customer/Marquee.jsx` — the scrolling trust band (replaces inline
    `TrustStrip` usage on customer pages; `TrustStrip` itself may be
    retired from these pages).
  - `customer/CursorAccent.jsx` — the custom gold cursor (no-op on touch /
    `hover:none`).
  - `lib/collectionGrid.js` (or inline helper) — the index→tile-size
    pattern function, kept pure and unit-reasoned.
- **`Categories.jsx` (admin)** — add the hero toggle + the
  set-hero-clearing-others write.
- **Floating buttons** — keep, but ensure labels/controls work on touch
  (no hover dependency), matching the admin fix.

Existing data-fetching patterns (inline `fetch`/`load` in each page, passed
to modals as refresh callbacks) are preserved.

## Migration

```sql
alter table categories add column if not exists is_hero boolean not null default false;
```

Applied via Supabase MCP `apply_migration`. Reversible (drop column). No
data backfill required; fallback handles "no hero set."

## Testing

No automated suite exists. Manual verification:

- Landing at desktop ≥1024px: hero letters animate; hero photo = the marked
  hero collection; broken grid art-directed; hover zoom/ring/Explore work;
  marquee scrolls; cursor accent on desktop only.
- Landing at 375px: 2-column/featured stack, nav collapsed, no cursor, no
  horizontal scroll, images load from Supabase.
- Collections with 1, 3, and many categories all look intentional.
- A category with no `image_url` shows the monogram tile.
- Category page: products render with prices, ratings, badges; tapping a
  card opens `ProductMediaModal`; Review opens `ReviewModal`; sold-out and
  low-stock badges correct.
- Admin Categories: marking a hero clears the previous; customer hero
  updates accordingly; clearing all falls back to newest-with-image.
- `npm run build` passes; `npm run lint` shows no new errors beyond the
  pre-existing `set-state-in-effect` baseline.

## Risks / Notes

- The broken-grid pattern must be verified at small counts (1–2
  collections) so a lone tile still reads as designed; the pattern function
  handles this by making index 0 the feature size and degrading gracefully.
- Hero image is art-directed (tall frame); very wide or very short source
  images are `object-fit: cover`, so framing is safe.
- Keep image-heavy animations GPU-friendly (`transform`/`opacity` only) for
  smooth mobile performance.
- `is_hero` single-true invariant is enforced in app code (clear-others on
  set), not a DB constraint — acceptable for a single-admin app.
