# Levaro Tracker — Delete + User Profile Dropdown

**Date:** 2026-05-28  
**Status:** Approved

## Context

Users need to delete categories and products. A user profile icon in the navbar should let each user set an avatar and change their password via a dropdown, replacing the current plain logout button.

---

## 1. Delete Categories

### DeleteCategoryModal (`src/components/DeleteCategoryModal.jsx`)

Props: `{ category, productCount, onClose, onDeleted }`

- If `productCount > 0`: shows a red-bordered warning block — "This category contains X products. All products, purchases, and sales will be permanently deleted."
- Always requires typing the category name exactly to confirm; Delete button is disabled until typed value matches `category.name`
- On confirm:
  1. Fetch all products in the category (id + image_url)
  2. Delete products by IDs (purchases + sales cascade via `ON DELETE CASCADE`)
  3. Delete the category row
  4. Best-effort storage cleanup: remove product images from `product-images` bucket, remove category image from `category-images` bucket

### Categories.jsx changes

- Add `deletingCategory` state (null | category object)
- Replace the single pencil button on each card with a flex row containing pencil + trash buttons (both opacity-0, group-hover:opacity-100)
- Trash button: `e.stopPropagation()` + `setDeletingCategory(cat)`
- Render `<DeleteCategoryModal category={deletingCategory} productCount={deletingCategory.products?.[0]?.count ?? 0} onClose={() => setDeletingCategory(null)} onDeleted={fetchCategories} />` when `deletingCategory !== null`

---

## 2. Delete Products

### DeleteProductModal (`src/components/DeleteProductModal.jsx`)

Props: `{ product, onClose, onDeleted }`

- If `product.purchases.length > 0 || product.sales.length > 0`: red-bordered warning — "This product has purchase and sale records. All associated data will be permanently deleted."
- Otherwise: plain "This action cannot be undone."
- No name typing required — single "Delete" button
- On confirm: delete product row (purchases + sales cascade), best-effort storage cleanup

### Products.jsx changes

Same pattern: `deletingProduct` state, pencil + trash flex row on each card, `<DeleteProductModal>` rendered when set.

---

## 3. User Profile Dropdown

### Supabase: `avatars` bucket

New public Storage bucket `avatars`. Policy: authenticated users can manage objects whose first path segment matches their user ID (`auth.uid()::text = (storage.foldername(name))[1]`). Public read policy for all.

### ProfileDropdown (`src/components/ProfileDropdown.jsx`)

Props: `{ onClose }`

Reads `user` from `useAuth()`. A `ref`-based outside-click handler closes the dropdown.

Sections (top to bottom):
1. **Header** — avatar circle + email address
2. **Change avatar** — file picker link, uploads to `avatars` bucket at path `${user.id}/avatar` with `upsert: true`, calls `supabase.auth.updateUser({ data: { avatar_url } })`; adds `?t=<timestamp>` cache-buster to the public URL
3. **Change password** — two inputs (new + confirm), calls `supabase.auth.updateUser({ password })`, validates match + min 6 chars
4. **Logout** — at bottom, calls `logout()` then navigates to `/login`

File validation: rejects non-images and files > 5 MB.

### Navbar.jsx changes

- Remove direct `logout` usage and `useNavigate`
- Add `showProfile` state + `useAuth` to get `user`
- Replace logout button with a circular avatar button (gold letter or photo); clicking toggles `showProfile`
- Render `<ProfileDropdown onClose={() => setShowProfile(false)} />` inside a `relative` wrapper when `showProfile` is true

---

## 4. Files Changed Summary

| File | Change |
|---|---|
| `src/components/DeleteCategoryModal.jsx` | Create |
| `src/components/DeleteProductModal.jsx` | Create |
| `src/components/ProfileDropdown.jsx` | Create |
| `src/pages/Categories.jsx` | Trash icon + deletingCategory state |
| `src/pages/Products.jsx` | Trash icon + deletingProduct state |
| `src/components/Navbar.jsx` | Avatar circle + ProfileDropdown |
| `supabase/schema.sql` | avatars bucket + policies |

---

## 5. Verification

1. Category with products → delete button → warning shown → must type name → deletes everything
2. Category with no products → delete button → no warning → must type name → deletes
3. Product with purchases/sales → delete → warning shown → confirm → deletes all
4. Product with no data → delete → plain confirm → deletes
5. Navbar shows first letter circle; clicking opens dropdown
6. Upload avatar → circle updates in navbar header
7. Change password → success message → can log out and log back in with new password
8. Clicking outside dropdown closes it
9. `npm run build` passes
