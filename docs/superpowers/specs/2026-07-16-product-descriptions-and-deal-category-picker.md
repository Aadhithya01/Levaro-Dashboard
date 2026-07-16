# Product descriptions + deal category picker

**Date:** 2026-07-16

## 1. Product descriptions

- **Data:** `products.description text` (nullable, CHECK ≤ 2000 chars). Dev + live. Anon
  already has table-level SELECT on `products`, so the shop can read it.
- **Shop display:** in the product popup only (`ProductMediaModal`) — a paragraph under
  the price, hidden when empty. `CustomerCategory` product query adds `description`.
- **Editing (two ways):**
  - New admin page `src/pages/DescriptionsAdmin.jsx` (route `/descriptions`, Navbar link
    next to Coupons): lists products with **no** description; each row has a textarea +
    Save; saving updates the product and removes the row. Empty state when none remain.
  - `AddProductModal` + `EditProductModal` get a description textarea (edit any product's
    description). `Products.jsx` already selects `*`, so the current value threads through.

## 2. Deal admin → category-first picker

`AddDealModal` gains a category dropdown; the product dropdown then lists only that
category's products that have a `selling_price` and aren't already on deal for the date.
`DealOfTheDay.jsx` fetches categories + products (`id, name, code, selling_price,
category_id`) and passes both to the modal.

## 3. Coupons — no change

Admin already supports % off, ₹ off, min-order, expiry, max-uses, active. Confirmed complete.

## Non-goals

- No rich text / markdown in descriptions (plain text, newlines preserved).
- Description not shown on grid tiles or deal cards (popup only).
