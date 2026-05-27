# Levaro Tracker — Images + Product Card Grid

**Date:** 2026-05-27  
**Status:** Approved

## Context

Categories and products need optional photo support. Users upload photos from their device. Products inside a category should display as a card grid (not a table), matching the visual style of the categories grid. Category cards should also support photos.

---

## 1. Data Model

Two new nullable columns added via Supabase migration:

```sql
ALTER TABLE categories ADD COLUMN image_url text;
ALTER TABLE products ADD COLUMN image_url text;
```

Two Supabase Storage buckets created as **public** (anyone can read, authenticated users can upload):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('category-images', 'category-images', true),
  ('product-images',  'product-images',  true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to each bucket
CREATE POLICY "authenticated users can upload category images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
```

Public buckets allow unauthenticated read — no SELECT policy needed.

`image_url` stores the Supabase Storage public URL. It is nullable — no image is valid for both categories and products.

---

## 2. Image Upload Flow

Both modals follow the same pattern:

1. User taps the image picker button → native file browser opens (accepts image/*)
2. User selects a file → thumbnail preview shown in the modal
3. On form submit: upload file to the appropriate bucket using `supabase.storage.from(bucket).upload(path, file)`, retrieve the public URL via `supabase.storage.from(bucket).getPublicUrl(path)`, then include `image_url` in the DB insert
4. If no file selected, `image_url` is omitted from the insert (stays null)

File path pattern: `{uuid}.{ext}` — a random UUID as the filename to avoid collisions.

---

## 3. Categories Page

**`src/pages/Categories.jsx`** — modified

Card rendering logic:
- If `cat.image_url` is set: full-photo square card — image fills the card, dark gradient overlay at the bottom, category name (white bold) + product count (gold) overlaid
- If `cat.image_url` is null: current letter-avatar card unchanged (white card, green circle with gold letter, name, count below)

Both card types: same size, same grid (3 columns), same hover effect (border turns brand-green).

---

## 4. Products Page

**`src/pages/Products.jsx`** — modified

The `<table>` is replaced with a 3-column photo grid matching the category card style:

- If `product.image_url` is set: full-photo square card — image fills card, dark gradient overlay, product name (white bold) + stock (white) + profit (gold or red) overlaid
- If `product.image_url` is null: soft green placeholder background (`bg-brand-green/20`) fills the square with the first letter of the product name centered in brand-green

Clicking a card still navigates to `/products/:id`.

---

## 5. AddCategoryModal

**`src/components/AddCategoryModal.jsx`** — modified

Adds an optional image upload section below the name input:

```
[ 📷 Add photo (optional) ]   ← clicking opens file picker
[ thumbnail preview if selected ]
```

- `<input type="file" accept="image/*">` hidden, triggered by a styled button
- Preview: 60×60px rounded thumbnail shown after file selection
- On submit: upload then insert with `image_url`

---

## 6. AddProductModal

**`src/components/AddProductModal.jsx`** — modified

Same image upload section as `AddCategoryModal`, placed below the product name input. Uploads to `product-images` bucket.

---

## 7. Product Detail Page

**`src/pages/ProductDetail.jsx`** — modified

If `product.image_url` is set, render a full-width image banner at the top of the content area (below the navbar, above the product name heading):

```jsx
{product.image_url && (
  <img src={product.image_url} alt={product.name}
    className="w-full h-48 object-cover rounded-lg mb-4" />
)}
```

If no image, the page renders as before.

---

## 8. Files Changed Summary

| File | Change |
|---|---|
| `supabase/schema.sql` | Document new migration |
| `src/pages/Categories.jsx` | Conditional photo card vs letter card |
| `src/pages/Products.jsx` | Replace table with photo card grid |
| `src/components/AddCategoryModal.jsx` | Add optional image upload |
| `src/components/AddProductModal.jsx` | Add optional image upload |
| `src/pages/ProductDetail.jsx` | Add image banner at top |

---

## 9. Verification

1. `npm run build` passes with no errors
2. Add Category with no photo → letter-avatar card appears
3. Add Category with a photo → photo fills the card, name + count overlaid
4. Open a category → product grid (not table)
5. Add Product with no photo → green placeholder card with first letter
6. Add Product with a photo → photo fills card, name + stock + profit overlaid
7. Click a product card → Product Detail page, image banner shows at top
8. Existing categories and products (no image_url) render correctly without errors
