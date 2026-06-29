# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, port 5173)
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build
```

No test suite exists in this project.

## Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# EmailJS — used by customer feedback/suggestion/review modals
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_EMAILJS_TEMPLATE_FEEDBACK_ID=...
VITE_EMAILJS_TEMPLATE_SUGGESTION_ID=...
VITE_EMAILJS_TEMPLATE_REVIEW_ID=...
```

## Architecture

**Stack**: React 19 + Vite, Tailwind CSS v3, Supabase (auth + database + storage + edge functions), React Router v7, Recharts, EmailJS.

**Entry**: `src/main.jsx` wraps the app in `BrowserRouter` → `AuthProvider` → `CartProvider` → `App`. `AuthProvider` (`src/contexts/AuthContext.jsx`) exposes `{ user, loading, login, logout }` via `useAuth()`. `CartProvider` (`src/contexts/CartContext.jsx`) exposes `useCart()` and backs the customer cart with `localStorage` (key `levaro_cart`).

**Routing** (`src/App.jsx`): Protected (auth-gated, redirect to `/login`): `/` (Categories), `/categories/:categoryId` (Products), `/products/:id` (ProductDetail), `/dashboard`, `/ledger`, `/tasks`, `/set-prices`, `/welcome`. Public customer storefront (no auth): `/shop` (CustomerShop) and `/shop/:categoryId` (CustomerCategory). Unknown paths redirect to `/`.

**Two surfaces, one app**: the authenticated side is the internal inventory/business tool; the `/shop` routes plus everything in `src/components/customer/` are the public storefront. The storefront uses the cart (`CartButton`/`CartDrawer`/`CheckoutModal` — checkout composes a WhatsApp order message), `ReviewModal` (writes `product_reviews` and emails via EmailJS), and floating `FeedbackModal`/`SuggestionModal` (EmailJS only, no DB).

**Data fetching**: All Supabase queries are written directly inside components — there is no service/API layer. The standard pattern is a `fetchData()` or `fetchAll()` function defined inside the component that's called in `useEffect` and also passed as `onAdded`/`onUpdated` to modals so they can trigger a refresh after mutation.

**Modal pattern**: Every create/edit/delete action opens a modal component (`AddXModal`, `EditXModal`, `DeleteXModal`). Modals receive an `onClose` callback and an `onAdded`/`onUpdated`/`onDeleted` callback. They manage their own form state and call Supabase directly.

**Supabase schema** (relevant tables):
- `categories` — `id, name, code, image_url, is_hero` (one hero category drives the Welcome/landing visual)
- `products` — `id, name, image_url, selling_price, category_id`
- `product_images` — `id, product_id, media_url, media_type, sort_order` (multi-image/video gallery per product)
- `product_reviews` — `id, product_id, ... , created_at` (written by the public `ReviewModal`)
- `purchases` — `id, product_id, quantity, price_per_piece, date_of_purchase`
- `sales` — `id, product_id, quantity_sold, selling_price, sale_date`
- `tasks` — `id, title, due_date, assigned_to (member_id), status ('pending'|'done'), created_at`
- `app_settings` — `key, value` (e.g. `image_enhancement_prompt` consumed by the edge function)
- `ledger_members` — `id, name, email`
- `ledger_expenses` — `id, description, amount, paid_by (member_id), created_by (user_id), created_at`
- `ledger_splits` — `id, expense_id, member_id, amount`
- `ledger_settlements` — `id, from_member, to_member, amount, note, created_at, created_by`

RLS is "all authenticated users can do everything" (shared workspace, no per-user ownership) except the `avatars` storage bucket which is per-user. Storage buckets: `category-images`, `product-images`, `avatars` (all public-read).

> **Schema source of truth**: `supabase/schema.sql` is an append-only migration log but is **stale** — later tables/columns (`product_images`, `product_reviews`, `tasks`, `app_settings`, `selling_price`, `is_hero`) were applied via Supabase MCP migrations and are not in it. Trust the live DB / component queries over `schema.sql`.

**Edge function** (`supabase/functions/process-image/index.ts`): AI product-photo enhancement. Accepts a multipart upload, runs it through HuggingFace `instruct-pix2pix` (prompt read from `app_settings.image_enhancement_prompt`), uploads the result to the `product-images` bucket, and returns `{ url, path }`. Falls back to the original image on any HF failure. Requires `HUGGINGFACE_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` in the function env. `MediaUploadSection` / `MediaSlider` on the product modals consume this.

**Ledger feature**: Tracks shared expenses between three hardcoded members (identified by email; seeded in `schema.sql`). `src/lib/ledgerUtils.js` exports `netBetween(mAId, mBId, expenses, settlements)` which computes the net balance from raw expense splits and settlement records. The Ledger page (`src/pages/Ledger.jsx`) hardcodes pairs of members for balance display.

**Layout helper**: `src/lib/collectionGrid.js` (`tileSpan(index)`) returns Tailwind col/row-span classes for the art-directed "broken" magazine grid on collection/category tiles — a pure function of index so any item count looks intentional.

**Plans/specs**: `docs/superpowers/plans/` and `docs/superpowers/specs/` hold dated historical implementation plans — useful for understanding why a feature is shaped the way it is.

## Styling

Tailwind with custom brand tokens defined in `tailwind.config.js` (if present) or inlined usage:
- `brand-green` — primary dark green (`#1a5c45`)
- `brand-gold` — gold/yellow accent (text and buttons)
- `brand-cream` — off-white background
- `brand-border` — subtle border color

The `Navbar` is included at the top of every authenticated page. `NavBalance` inside the navbar shows the current user's ledger balance at a glance.
