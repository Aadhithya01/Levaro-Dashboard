# Vendor Order Log & Per-Colour Product Variants — Design

Date: 2026-06-29

Two independent features, delivered under one spec and one implementation plan
(build order: **Feature 1 first, then Feature 2**).

1. **Vendor Order Log** — a standalone log of orders placed with vendors.
2. **Per-colour product variants** — products can have multiple colours, each with
   its own name, photo, and tracked stock; customers pick a colour before adding to cart.

Schema changes are applied via Supabase MCP migrations and mirrored into
`supabase/schema.sql` (currently stale).

---

## Feature 1 — Vendor Order Log

### Purpose
Record orders we place with vendors: who, how much, how many, where, and a copy of
the bill. Pure record-keeping — **not** linked to products or the inventory/stock model.

### Data

New table `vendor_orders`:

| column        | type           | notes                                  |
|---------------|----------------|----------------------------------------|
| `id`          | uuid pk        | `gen_random_uuid()`                    |
| `vendor_name` | text not null  | vendor/supplier name                   |
| `phone`       | text           | vendor contact phone (optional)        |
| `order_price` | numeric(10,2)  | total price of the order               |
| `quantity`    | integer        | `CHECK (quantity > 0)` when present     |
| `location`    | text           | where ordered from / delivery location |
| `bill_url`    | text           | public URL of uploaded bill copy       |
| `bill_path`   | text           | storage path (for deletion)            |
| `created_by`  | uuid           | `auth.uid()` of logger (optional)      |
| `created_at`  | timestamptz    | default `now()`                        |

- New **public** storage bucket `order-bills`. Accepts images **and PDFs**.
- RLS: `authenticated` can do everything (matches every other table in this app).
- Storage INSERT policy for `authenticated` on bucket `order-bills`, plus public read.

### UI

- **New page** `src/pages/Orders.jsx`, route `/orders` wrapped in `ProtectedRoute`
  (added to `src/App.jsx`).
  - Header: title "Orders" + **`+ Log Order`** button.
  - List of orders (cards or a table, following the `ProductDetail`/`Tasks` visual
    language): vendor name, phone, quantity, order price, location, and a
    **"View bill"** link/thumbnail that opens `bill_url` in a new tab. Each row has
    Edit / Delete actions.
  - Empty state consistent with `Categories` empty state.
  - `fetchOrders()` defined in the component, called in `useEffect`, passed as
    `onAdded`/`onUpdated`/`onDeleted` to the modals.
- **Modals** (existing pattern — own form state, call Supabase directly):
  - `AddOrderModal` — fields: vendor name (required), phone, order price, quantity,
    location, bill copy upload. On submit: upload bill to `order-bills` (if provided),
    get public URL, insert `vendor_orders` row (rollback the uploaded file on insert
    error, mirroring `AddProductModal`).
  - `EditOrderModal` — edit fields; replacing the bill uploads a new file and removes
    the old `bill_path`.
  - `DeleteOrderModal` — deletes the row and removes `bill_path` from storage.
- **Bill upload control**: a small inline uploader (single file). Reuse the
  established upload/preview idiom from `MediaUploadSection` but allow
  `accept="image/*,application/pdf"`; for a PDF preview show a file icon + filename
  rather than an `<img>`.

### Navigation
- Add **Orders** link to `src/components/Navbar.jsx` (desktop) with an `ordersActive`
  flag (`pathname.startsWith('/orders')`).
- Add an **Orders** item to `src/components/MobileNav.jsx` (the bottom pill grows from
  5 to 6 icons — verify it still fits on a narrow screen; icons are `w-11 h-11`).

---

## Feature 2 — Per-Colour Product Variants (with stock)

### Purpose
A jewellery product can come in multiple colours. Each colour has its own **name**,
its own **uploaded photo**, and its own **quantity** (the colour's starting stock).
Stock is tracked **per colour**. On the storefront, customers see each colour's photo
and **must pick a colour before adding to cart**.

### Data

New table `product_variants`:

| column       | type          | notes                              |
|--------------|---------------|------------------------------------|
| `id`         | uuid pk       | `gen_random_uuid()`                |
| `product_id` | uuid not null | FK → `products(id)` ON DELETE CASCADE |
| `color_name` | text not null | e.g. "Rose Gold"                   |
| `image_url`  | text          | public URL of the colour's photo   |
| `image_path` | text          | storage path (for deletion)        |
| `created_at` | timestamptz   | default `now()`                    |

Add a nullable `variant_id` to **both**:
- `purchases.variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE`
- `sales.variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE`

Index `purchases(variant_id)` and `sales(variant_id)`.

RLS: `product_variants` — `authenticated` can do everything. Colour photos go in the
existing `product-images` bucket.

### Stock model
- **Buy price and selling price stay single** (shared across all colours of a product).
- A product **with no variants** behaves exactly as today:
  `stock = Σ purchases.quantity − Σ sales.quantity_sold` (all `variant_id` null).
- A product **with variants**:
  - per-colour stock = `Σ purchases.quantity` for that `variant_id`
    − `Σ sales.quantity_sold` for that `variant_id`.
  - **product total stock = (uncoloured stock from variant-less rows) + Σ per-colour stock.**
    This makes converting an existing product to multi-colour safe: its pre-existing
    purchases/sales remain variant-less "no-colour" stock and are simply added on top
    of the new colour stock. No data migration.

### Admin — Add product (`AddProductModal`)
- Add a **"Multiple colour options"** checkbox.
- **Unchecked** → current behaviour unchanged (single Quantity field → single
  variant-less `purchases` row).
- **Checked** → hide the single Quantity field; show a **colour repeater**. Each row:
  - colour name (text, required)
  - one photo upload (required) — single image per colour
  - quantity (int ≥ 1, required) = that colour's starting stock
  - add-row / remove-row controls; at least one colour row required.
  - Buy price + selling price remain single shared fields.
- **Submit flow (checked):**
  1. Upload general product media (existing logic) — first media item becomes
     `products.image_url`; if no general media, fall back to the first colour's photo.
  2. Insert `products` (shared `selling_price`, etc.).
  3. Upload each colour photo to `product-images`; insert `product_variants` rows
     (`color_name`, `image_url`, `image_path`).
  4. Insert one `purchases` row **per colour** (shared buy price, that colour's
     quantity, `variant_id` = the colour's variant id, `date_of_purchase` = today).
  5. On any failure, roll back uploaded files and the inserted product
     (mirror the existing rollback approach in `AddProductModal`).

### Admin — Edit product (`EditProductModal`)
- Add a **Colours** section:
  - List existing colours (thumbnail + name) with edit (name/photo) and remove.
  - Add new colours (name + photo). Adding a colour creates a `product_variants` row
    with **no stock** — keep edit free of stock side effects. Stock for a newly added
    colour is then entered via the Add-Stock flow on `ProductDetail` (which carries
    `variant_id`).
  - **Remove a colour** is allowed **only when it has no recorded sales**. Removing
    deletes the variant (cascades its purchases) and its photo from storage. If the
    colour has sales, the remove control is disabled with a tooltip.

### Admin — Product detail (`ProductDetail.jsx`)
- When the product has variants, show a **per-colour stock breakdown** (photo
  thumbnail · colour name · current stock) above or beside the existing stat cards.
- Total **Stock** card = uncoloured stock + Σ per-colour stock.
- `AddPurchaseModal` and `AddSaleModal`: when the product has variants, show a
  **colour selector**:
  - Add-Stock: required colour selector → the new `purchases` row carries `variant_id`.
  - Add-Sale: required colour selector showing each colour's available stock → the new
    `sales` row carries `variant_id`. (Admin may still record the sale even if it
    exceeds shown stock; no hard block — consistent with current app, which doesn't
    block overselling.)
  - For products with no variants, these modals are unchanged (no selector,
    `variant_id` stays null).
- `fetchData()` additionally loads `product_variants` for the product.

### Customer storefront

`CustomerCategory.jsx`
- Extend the products query to also select
  `product_variants(id, color_name, image_url, purchases(quantity), sales(quantity_sold))`.
- Compute per-colour stock client-side. For a product with variants:
  - `soldOut` = every colour has stock ≤ 0 **and** uncoloured stock ≤ 0.
  - The card still opens `ProductMediaModal`; colour selection happens there.
- On the grid card, the existing single "ADD TO CART" button:
  - For products **with** variants → label stays "ADD TO CART" but clicking opens the
    product modal (so the customer can choose a colour) instead of adding directly.
    (Direct add only for variant-less products, as today.)

`ProductMediaModal.jsx`
- If the product has variants, render a **colour selector**: a row of photo thumbnails,
  each labelled with its colour name. Selecting a colour:
  - swaps the main displayed image to that colour's photo,
  - is **required** before "ADD TO CART" is enabled.
  - colours with stock ≤ 0 are shown disabled ("Sold out").
- `addItem` is called with `{ ..., color: colorName, variantId, image: colourPhoto }`.
- Variant-less products: unchanged.

### Cross-cutting — Cart (`CartContext.jsx`)
- `addItem(product)` accepts optional `color` (string) and `variantId`.
- **Line identity** changes from bare `id` to a composite key `lineKey = `${id}::${color ?? ''}``
  so the same product in two colours is two lines.
- `removeItem`, `setQty`, and `has` operate on `lineKey` (update call sites in
  `CartDrawer`).
- Stored cart shape gains `color` and `variantId` (optional). Existing stored carts
  (without these) remain valid — missing `color` ⇒ empty colour segment.

`CartDrawer.jsx`
- Show the colour under the product name when present.
- `key`, quantity, and remove handlers use `lineKey`.

`CheckoutModal.jsx`
- `buildMessage` includes the colour in each order line when present:
  `1. Ring (R-01) — Rose Gold — Qty: 2 — ₹500`.

---

## Components / files touched

**New**
- `src/pages/Orders.jsx`
- `src/components/AddOrderModal.jsx`, `EditOrderModal.jsx`, `DeleteOrderModal.jsx`
- (optional helper) a single-file bill uploader, or inline in the order modals.

**Modified**
- `src/App.jsx` — `/orders` route.
- `src/components/Navbar.jsx`, `src/components/MobileNav.jsx` — Orders nav entry.
- `src/components/AddProductModal.jsx` — colour checkbox + repeater + per-colour purchases.
- `src/components/EditProductModal.jsx` — colours section (add/edit/remove).
- `src/pages/ProductDetail.jsx` — per-colour stock breakdown; load variants.
- `src/components/AddPurchaseModal.jsx`, `src/components/AddSaleModal.jsx` — colour selector.
- `src/pages/CustomerCategory.jsx` — variant query + per-colour stock + open-modal-to-pick.
- `src/components/customer/ProductMediaModal.jsx` — colour selector UI.
- `src/contexts/CartContext.jsx` — colour-aware line identity.
- `src/components/customer/CartDrawer.jsx` — show colour, lineKey handlers.
- `src/components/customer/CheckoutModal.jsx` — colour in WhatsApp message.
- `supabase/schema.sql` — append the new tables/columns/buckets/policies.

**Database (via Supabase MCP migrations)**
- `create_vendor_orders` (+ `order-bills` bucket & policies)
- `create_product_variants` (+ `variant_id` on `purchases` and `sales` + indexes + RLS)

---

## Error handling
- Follow the established rollback idiom in `AddProductModal`: if a later insert fails,
  remove already-uploaded storage files and delete already-inserted parent rows.
- Bill / colour uploads validate type and size like `MediaUploadSection` (≤ 50 MB).
- Customer add-to-cart guards: variant products require a selected, in-stock colour.

## Testing
- No automated test suite exists. Verify manually:
  - Log / edit / delete an order; bill (image and PDF) opens correctly; delete removes file.
  - Add a product with colours; per-colour stock shows; add-stock and add-sale to a
    specific colour adjust that colour's stock; total stock = uncoloured + colours.
  - Convert an existing product to multi-colour: old stock preserved as uncoloured.
  - Storefront: pick a colour (image swaps), add to cart, two colours = two lines,
    WhatsApp message shows colours; sold-out colour disabled.

## Out of scope (YAGNI)
- Per-colour pricing (buy & selling price stay shared).
- Colour hex swatches (each colour uses an uploaded photo instead).
- Linking vendor orders to products/inventory.
- Reworking the global purchases/sales aggregation beyond adding `variant_id`.
