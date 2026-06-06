# Multi-Media Products Design

**Date:** 2026-06-07  
**Status:** Approved

## Summary

Add support for up to 10 images/videos per product. On the customer shop, product cards become swipeable sliders and tapping a card opens a full-screen media lightbox. Existing `products.image_url` data is never altered — the new system is purely additive.

---

## 1. Database

### New table: `product_images`

```sql
product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  media_url   text not null,
  media_type  text not null check (media_type in ('image', 'video')),
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
)
```

- Stored in the existing `product-images` Supabase Storage bucket — no new bucket.
- No changes to any existing table or column.

### Display order

When building the slider for a product:
1. `products.image_url` first (if it exists) — treated as `{ type: 'image' }`
2. Rows from `product_images` ordered by `sort_order` ascending

Old products with only `image_url` and no `product_images` rows display exactly as today (single image, no slider).

---

## 2. New Components

### `src/components/MediaSlider.jsx`

Reusable slider. Props: `items: Array<{ url: string, type: 'image'|'video' }>`.

- Touch swipe via `onTouchStart` / `onTouchEnd` (no external library)
- CSS `translateX` transition between slides
- Dot indicators at the bottom (hidden if only 1 item)
- Renders `<img>` for images, `<video autoPlay muted loop playsInline>` for videos
- Used on both the customer card and in the lightbox

### `src/components/MediaUploadSection.jsx`

Reusable upload widget for admin modals. Props: `items`, `onChange`, `maxItems = 10`.

- Shows existing media as thumbnails with individual ✕ remove buttons
- "Add photo/video" button opens a file picker (`accept="image/*,video/*"`)
- Enforces max 10 total items
- Each item is `{ file?, previewUrl, url?, type, isExisting, storagePath? }`
- Does not upload — the parent modal handles uploads on submit

### `src/components/customer/ProductMediaModal.jsx`

Full-screen customer lightbox. Props: `product`, `allMedia`, `onClose`, `onReview`.

- Large `MediaSlider` at the top
- Product name, price, stock status below
- "★ Review" button
- "✕" close button top-right
- No routing change — overlay modal, z-50

---

## 3. Admin Modal Changes

### AddProductModal

- Replace the single photo section with `<MediaUploadSection>`
- On submit:
  1. Upload all picked files to `product-images` storage (UUID filenames)
  2. Insert product row — `image_url` is set to the first uploaded file's public URL (or null if none)
  3. Insert remaining files (index 1+) as rows into `product_images`
- Existing submit logic (quantity, purchase insert) unchanged

### EditProductModal

- Replace the single photo section with `<MediaUploadSection>`
- On mount, pre-load items:
  - `products.image_url` → first item, marked `isExisting: true`, **non-removable** (no ✕ button)
  - All `product_images` rows for this product → subsequent items, removable
- On submit:
  - New files: upload to storage, insert into `product_images`
  - Removed items: delete storage object + delete `product_images` row
  - If the product currently has no `image_url` and no `product_images` rows, the section starts empty; on submit the first new upload sets `products.image_url` and subsequent ones go into `product_images`
  - `products.image_url` is only written during edit if it was previously null and new files were added

---

## 4. Customer-Facing Changes

### CustomerCategory page

- Query gains one extra join: `product_images(media_url, media_type, sort_order)`
- Each product card's image area replaced with `<MediaSlider items={allMediaForProduct} />`
- If only 1 media item exists, renders exactly as today (single image, no dots, no swipe)
- Tapping a card (not the Review button) opens `<ProductMediaModal>`
- Review button behaviour unchanged

### ProductMediaModal (new)

- Full-screen overlay (z-50) with backdrop
- Top: `<MediaSlider>` with full-width aspect-video or aspect-square
- Below: product name, price, stock status
- "★ Review" opens existing `ReviewModal`
- Close returns to the grid

---

## 5. Constraints

- Max 10 media items per product (enforced in `MediaUploadSection`)
- Each file max 5 MB for images; videos accepted but no explicit size cap in UI (Supabase storage limits apply)
- `products.image_url` is never modified by any new code path
- No new npm dependencies
- No new Supabase Storage bucket
- No changes to existing components beyond the two modal photo sections
