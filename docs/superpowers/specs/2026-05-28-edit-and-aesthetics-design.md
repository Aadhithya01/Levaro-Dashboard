# Levaro Tracker — Edit Functionality + Aesthetic Polish

**Date:** 2026-05-28  
**Status:** Approved

## Context

Categories and products are currently read-only after creation. Users need to be able to rename them and swap their photos. The site also has several UX rough edges: empty states are plain text, no stats summary is shown on list pages, stat cards on ProductDetail are all the same color, and the active navbar link is not highlighted.

---

## 1. Edit Functionality

### 1a. EditCategoryModal (`src/components/EditCategoryModal.jsx`)

Props: `{ category, onClose, onUpdated }`

- Pre-fills name input with `category.name`
- Shows current photo (if `category.image_url` set) as a 64×64 thumbnail with a "Change photo" link below it
- If no current photo: shows the dashed "📷 Add photo" picker button
- On submit: uploads new photo (if selected) to `category-images` bucket → gets public URL → calls `supabase.from('categories').update({ name, image_url }).eq('id', category.id)`
- Orphaned file cleanup: if upload succeeds but update fails, remove the new file from storage
- Old photos are NOT deleted from storage (URL is overwritten in DB; orphan cleanup is out of scope)
- File type and size validation: rejects non-image files and files > 5 MB

### 1b. EditProductModal (`src/components/EditProductModal.jsx`)

Same pattern as EditCategoryModal but:
- Props: `{ product, onClose, onUpdated }`
- Bucket: `product-images`
- Table: `products`

### 1c. Categories.jsx — edit button on cards

- Add `group` class to both card variants (photo card + letter card)
- Add `relative` to the letter card (photo card already has it)
- Overlay a pencil icon button in the top-right corner of each card: `absolute top-2 right-2`, `opacity-0 group-hover:opacity-100`, `z-10`
- Button `onClick`: calls `e.stopPropagation()` then sets `editingCategory` state to the category object
- Add `editingCategory` state (null | category object)
- Render `<EditCategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} onUpdated={fetchCategories} />` when `editingCategory !== null`
- Add portfolio strip above the grid (when categories.length > 0): shows category count + total product count as small pill-style stat badges

### 1d. Products.jsx — edit button on cards

- Same hover-pencil pattern
- Add `editingProduct` state (null | product object)
- Render `<EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onUpdated={fetchData} />` when `editingProduct !== null`
- Add summary bar between header and grid: `X products · Y in stock · ₹Z profit` (computed from already-fetched products data using `computeSummary`)

---

## 2. Aesthetic Polish

### 2a. Empty states — Categories.jsx and Products.jsx

Replace plain `<p className="text-gray-500 text-sm">No X yet.</p>` with a centered card:
- Green-tinted circle with an SVG icon
- Bold "No X yet" line
- Gray subtext
- A CTA button (same "+ Add X" action as the header button)

### 2b. ProductDetail.jsx — color-tinted stat cards

Each of the 4 stat cards gets a subtle background tint:
- **Stock**: `bg-brand-green/5 border-brand-green/20`
- **Total Cost**: keep white (`bg-white border-brand-border`)
- **Total Revenue**: `bg-brand-gold/10 border-brand-gold/20`
- **Profit**: `bg-brand-green/5 border-brand-green/20` if ≥ 0, `bg-red-50 border-red-200` if negative

### 2c. Navbar.jsx — active link highlight

Use `useLocation` to detect current route. Apply `text-brand-gold font-medium` to the active link, `text-brand-gold/70` to inactive.

- Categories link is active on: `/`, `/categories/*`, `/products/*`
- Dashboard link is active on: `/dashboard`

### 2d. Login.jsx — decorative divider

Between the tagline `<p>` and the form, add a centered ornamental divider:
```
  ─────── ✦ ───────
```
Using two `flex-1 h-px bg-brand-gold/30` lines flanking a gold `✦` character.

---

## 3. Files Changed Summary

| File | Change |
|---|---|
| `src/components/EditCategoryModal.jsx` | Create |
| `src/components/EditProductModal.jsx` | Create |
| `src/pages/Categories.jsx` | Edit button, portfolio strip, empty state |
| `src/pages/Products.jsx` | Edit button, summary bar, empty state |
| `src/pages/ProductDetail.jsx` | Color-tinted stat cards |
| `src/components/Navbar.jsx` | Active link highlight |
| `src/pages/Login.jsx` | Decorative divider |

---

## 4. Verification

1. `npm run build` passes
2. Click pencil on a category card → EditCategoryModal opens pre-filled with current name and photo
3. Change name only → saves correctly
4. Change photo → new photo appears on the card after save
5. Click pencil on a product card → EditProductModal opens
6. Categories page with no data → shows icon + CTA empty state
7. Products page with no data → same
8. ProductDetail → Stock card has green tint, Profit card green/red tint
9. Navbar → active link is fully gold, inactive is dimmed
10. Login page → gold divider between tagline and form
