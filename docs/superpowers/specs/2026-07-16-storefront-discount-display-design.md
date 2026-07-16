# Storefront cosmetic discount display

**Date:** 2026-07-16
**Surface:** Public storefront (`/shop`) only. Display-only; cart/checkout unaffected.

## Goal

Make prices look discounted: show a struck-out "original" price above the real
`selling_price`, plus an "X% OFF" badge. Increases perceived value. Customers are
still charged the real `selling_price`.

## Decisions

- **Original price** is derived from `selling_price` by a **fixed-percentage markup**
  (no DB column, no admin work).
- The percentage is **varied per product** and **stable** (derived from the product
  `id`, so it never changes on reload).
- Range: **25–45% OFF**.

## Derivation (`src/lib/discount.js`)

`discountFor(product) → { original, pct } | null`

1. If `selling_price` is null / not a positive number → return `null`.
2. `seededPct` = a value in `[25, 45]` from a hash of `product.id` (stable).
3. `original = ceil( selling_price / (1 - seededPct/100) / 10 ) * 10`
   (round **up to nearest ₹10** so it reads like a clean MRP and always exceeds price).
4. `pct = round( (original - selling_price) / original * 100 )` — recomputed from the
   rounded `original` so the badge exactly matches the two numbers shown.
5. If `original <= selling_price` or `pct < 1` → return `null` (fall back to plain price).

Pure function, no React, unit-checkable via Node.

## Display (`src/components/customer/PriceTag.jsx`)

`<PriceTag product size="sm" | "lg" />` — owns all price rendering:
- `selling_price == null` → grey "On request" (sm) / "Price on request" (lg).
- No discount → plain `₹price` in brand green.
- Discount → `₹price` (brand green, bold) · ~~`₹original`~~ (grey, line-through) ·
  `X% OFF` pill (brand-green text on faint green bg). `sm` for tiles, `lg` for modal.

## Wiring

- `src/pages/CustomerCategory.jsx` product tile: replace the price `<p>` with
  `<PriceTag product={product} size="sm" />`.
- `src/components/customer/ProductMediaModal.jsx`: replace the price `<p>` with
  `<PriceTag product={product} size="lg" />`.
- Cart (`CartDrawer`), `CheckoutModal`, and `addItem(...)` are **unchanged** — they
  keep using the real `selling_price`.

## Non-goals

- No schema change, no admin UI, no per-product override.
- No change to sold-out logic (discount shows regardless of stock).
- Not dev-specific: same code in dev and live; test via `npm run dev`.
