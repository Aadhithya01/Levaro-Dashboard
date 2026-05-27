# Levaro Tracker — Categories Feature + UI Rebrand

**Date:** 2026-05-27  
**Status:** Approved

## Context

The app launched with a flat product list. The business organises jewellery into types (Kada, Chain, Bangle, etc.), so products need to be grouped by category. Additionally, the UI should reflect the Levaro brand — dark forest green navbar with gold accents and a warm cream background, matching the brand logo.

---

## 1. Color Scheme

Replace the current indigo palette throughout with:

| Token | Value | Usage |
|---|---|---|
| Brand green | `#1a5c45` | Navbar background, button backgrounds, table headers, active states |
| Gold | `#e8c96a` | Navbar text/links, button text on green, decorative accents |
| Background | `#faf7f0` | All page backgrounds (warm cream) |
| Card border | `#e8e0d0` | White card borders |
| Profit green | `#1a5c45` | Positive profit values |
| Loss red | `#dc2626` | Negative profit values (unchanged) |

**Tailwind approach:** Extend `tailwind.config.js` with a custom `brand` palette so components use `bg-brand-green`, `text-brand-gold`, `bg-brand-cream` etc. instead of inline hex values. This keeps the color system consistent and easy to update.

```js
// tailwind.config.js extension
colors: {
  brand: {
    green: '#1a5c45',
    gold: '#e8c96a',
    cream: '#faf7f0',
    border: '#e8e0d0',
  }
}
```

---

## 2. Categories Feature

### Data model

New table added to Supabase via migration:

```sql
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can do everything on categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

`category_id` is nullable so existing/future products can exist without a category if needed.

### Navigation structure

| Route | Page | Change |
|---|---|---|
| `/` | Categories | **New** — replaces Products as home |
| `/categories/:id` | Products within category | **New** |
| `/products/:id` | Product detail | Unchanged |
| `/dashboard` | Dashboard | Unchanged (minor recolour) |

Navbar "Products" link → "Categories" link pointing to `/`.

### Categories page (`src/pages/Categories.jsx`) — new file

- Displays all categories as an icon card grid (3 columns)
- Each card: letter avatar (first letter of name, white text on brand-green circle), category name, product count
- "+ Add Category" button top-right opens `AddCategoryModal`
- Clicking a card navigates to `/categories/:id`
- Empty state: "No categories yet. Add your first one."
- Loading state
- Supabase query: `select('*, products(count)')` — returns each category with a nested `products: [{count: N}]` array; read as `category.products[0].count`

### AddCategoryModal (`src/components/AddCategoryModal.jsx`) — new file

- Single text input: category name
- Inserts into `categories` table
- Calls `onAdded()` + `onClose()` on success

### Products page (`src/pages/Products.jsx`) — modified

- Now receives `categoryId` from route param via `useParams()`
- Fetches only products where `category_id = categoryId`
- Shows category name as page title (fetched from Supabase)
- "← Back to Categories" link
- "+ Add Product" pre-fills `category_id` on insert
- `AddProductModal` receives `categoryId` prop and passes it to the insert

### AddProductModal (`src/components/AddProductModal.jsx`) — modified

- Accepts `categoryId` prop
- Passes `category_id: categoryId` in the Supabase insert

### App.jsx — modified

- New route: `<Route path="/categories/:id" element={<ProtectedRoute><Products /></ProtectedRoute>} />`
- Home route `/` now renders `<Categories />` instead of `<Products />`
- Remove old bare `/` → `<Products />` route

### Navbar.jsx — modified

- "Products" link → "Categories" pointing to `/`
- Recoloured to brand green + gold

---

## 3. Files Changed Summary

| File | Change |
|---|---|
| `tailwind.config.js` | Add brand color palette |
| `src/pages/Login.jsx` | Recolour (indigo → brand green/gold) |
| `src/components/Navbar.jsx` | Recolour + update Products→Categories link |
| `src/pages/Products.jsx` | Accept categoryId param, filter by category, back link |
| `src/components/AddProductModal.jsx` | Accept + pass categoryId |
| `src/pages/Dashboard.jsx` | Recolour only |
| `src/pages/ProductDetail.jsx` | Recolour only |
| `src/components/AddPurchaseModal.jsx` | Recolour only |
| `src/components/AddSaleModal.jsx` | Recolour only |
| `src/components/ProtectedRoute.jsx` | Recolour only |
| `src/pages/Categories.jsx` | **New** |
| `src/components/AddCategoryModal.jsx` | **New** |
| `src/App.jsx` | Add categories routes |
| `supabase/schema.sql` | Document new migration (apply via MCP) |

---

## 4. Verification

1. `npm run build` passes with no errors
2. Login page shows brand green button and gold/cream styling
3. After login, Categories page shows icon card grid
4. "+ Add Category" → type "Kada" → card appears with "K" avatar
5. Click "Kada" → Products page with "Kada" as title, "← Back to Categories" link
6. "+ Add Product" in Kada → product appears in Kada's list only
7. Navigate to another category — Kada's product does NOT appear
8. Dashboard still loads and charts render
9. Product detail still works
10. Deploy to Netlify via `npm run build` + redeploy
