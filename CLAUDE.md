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
```

## Architecture

**Stack**: React 19 + Vite, Tailwind CSS v3, Supabase (auth + database), React Router v7, Recharts.

**Entry**: `src/main.jsx` wraps the app in `BrowserRouter` → `AuthProvider` → `App`. `AuthProvider` (`src/contexts/AuthContext.jsx`) exposes `{ user, loading, login, logout }` via `useAuth()`.

**Routing** (`src/App.jsx`): All inventory/business pages are wrapped in `ProtectedRoute` (redirects to `/login` if unauthenticated). `/shop` and `/shop/:categoryId` are public customer-facing views without auth.

**Data fetching**: All Supabase queries are written directly inside components — there is no service/API layer. The standard pattern is a `fetchData()` or `fetchAll()` function defined inside the component that's called in `useEffect` and also passed as `onAdded`/`onUpdated` to modals so they can trigger a refresh after mutation.

**Modal pattern**: Every create/edit/delete action opens a modal component (`AddXModal`, `EditXModal`, `DeleteXModal`). Modals receive an `onClose` callback and an `onAdded`/`onUpdated`/`onDeleted` callback. They manage their own form state and call Supabase directly.

**Supabase schema** (relevant tables):
- `categories` — `id, name, code, image_url`
- `products` — `id, name, image_url, selling_price, category_id`
- `purchases` — `id, product_id, quantity, price_per_piece, date_of_purchase`
- `sales` — `id, product_id, quantity_sold, selling_price, sale_date`
- `ledger_members` — `id, name, email`
- `ledger_expenses` — `id, description, amount, paid_by (member_id), created_by (user_id), created_at`
- `ledger_splits` — `id, expense_id, member_id, amount`
- `ledger_settlements` — `id, from_member, to_member, amount, note, created_at, created_by`

**Ledger feature**: Tracks shared expenses between three hardcoded members (identified by email). `src/lib/ledgerUtils.js` exports `netBetween(mAId, mBId, expenses, settlements)` which computes the net balance from raw expense splits and settlement records. The Ledger page (`src/pages/Ledger.jsx`) hardcodes pairs of members for balance display.

## Styling

Tailwind with custom brand tokens defined in `tailwind.config.js` (if present) or inlined usage:
- `brand-green` — primary dark green (`#1a5c45`)
- `brand-gold` — gold/yellow accent (text and buttons)
- `brand-cream` — off-white background
- `brand-border` — subtle border color

The `Navbar` is included at the top of every authenticated page. `NavBalance` inside the navbar shows the current user's ledger balance at a glance.
