# Customer Cart + WhatsApp Checkout — Design

**Date:** 2026-06-13
**Status:** Approved (pending spec review)

## Goal

Let shoppers on the public customer site (`/shop`) add products to a cart,
adjust quantities, see a running total, and place an order that is delivered to
the business's WhatsApp. No customer accounts.

## Key decisions

- **No customer authentication.** The existing Supabase Auth is for business
  owners/admins only and is untouched.
- **Cart lives in the browser (`localStorage`)**, exposed app-wide via a React
  Context. This makes each cart inherently private per device — there is no
  shared server state, so one customer can never see another's cart.
- **Order delivery uses a `wa.me` deep link** (free, no backend). The customer
  taps Send in their own WhatsApp; the business receives the order along with
  the customer's number automatically.
- **Adjustable quantity** per cart line.
- **Checkout collects:** Name, Phone, Delivery address.

## Architecture

State management follows the existing `AuthProvider` pattern: a single context
provider wrapped around the app, persisted to `localStorage`.

### Components

**1. `src/contexts/CartContext.jsx` (new)**
- State: `items` = array of `{ id, name, code, price, image, qty }`.
- API: `addItem(product)`, `removeItem(id)`, `setQty(id, n)`, `clear()`.
- Derived: `count` (total item quantity), `total` (sum of `price * qty`).
- Persistence: read on init from `localStorage` key `levaro_cart`; write on every
  change.
- Exposed via `useCart()` hook (mirrors `useAuth()`).
- Wrapped around the app in `src/main.jsx` so the customer header badge and all
  shop pages can read it. Admin pages simply do not consume it.

**2. "Add to Cart" buttons**
- Added to `src/pages/CustomerCategory.jsx` grid tiles (alongside the existing
  Review button).
- Added to `src/components/customer/ProductMediaModal.jsx` (product popup).
- **Disabled** for sold-out products and for "Price on request" products
  (`selling_price == null`) — a reliable total cannot be computed without a
  price. Disabled state is visually distinct.
- Price is **snapshotted** into the cart line at add-time; a later admin price
  change does not retro-update an existing cart.

**3. Cart UI — slide-in drawer**
- Triggered by a cart icon + live count badge in the customer top-nav.
  Note: `CustomerShop.jsx` and `CustomerCategory.jsx` each define their own
  inline `<header>` today. A small reusable `CartButton` component (icon +
  badge, opens the drawer) is placed into both headers, rather than assuming a
  single shared nav. The drawer itself is rendered once at the cart provider /
  layout level.
- Lists each line: image, name, code, unit price, `[− qty +]` control, line
  total, remove button.
- Footer: grand **Total** and a **Checkout** button (disabled when cart empty).

**4. `src/components/customer/CheckoutModal.jsx` (new)**
- Form fields: Name (required), Phone (required), Delivery address (required).
- On submit, builds an order message and opens
  `https://wa.me/<number>?text=<url-encoded message>` in a new tab.
- After opening WhatsApp, offers to clear the cart.

**5. Configuration**
- Business WhatsApp number stored in `.env` as `VITE_WHATSAPP_NUMBER`
  (e.g. `919876543210`, country code + number, no `+` or spaces). Not hardcoded,
  not committed.

### Data flow

```
Product (grid / modal)
  -> addItem(product)            // CartContext, writes localStorage
  -> cart badge count updates    // header reads useCart().count
  -> open cart drawer            // edit qty / remove
  -> Checkout                    // CheckoutModal collects name/phone/address
  -> build message + wa.me link  // opens WhatsApp prefilled
  -> customer taps Send          // order lands in business WhatsApp
  -> offer clear()               // empties cart
```

### Order message format

```
New order from <Name>
Phone: <phone>
Address: <address>

• <name> (<code>) ×<qty> — ₹<lineTotal>
• <name> (<code>) ×<qty> — ₹<lineTotal>

Total: ₹<grandTotal>
```

The whole string is URL-encoded before being placed in the `text` query param.
If a product has no `code`, the `(<code>)` segment is omitted for that line.

## Edge cases

- **Empty cart:** Checkout button disabled; drawer shows an empty state.
- **Sold-out / price-on-request products:** "Add to Cart" disabled.
- **Refresh / revisit:** cart persists via `localStorage` (per device only;
  clearing browser data loses it — acceptable with no accounts).
- **Missing `VITE_WHATSAPP_NUMBER`:** checkout should surface a clear error
  rather than opening a broken link.
- **Duplicate add:** adding a product already in the cart increments its `qty`
  rather than creating a second line.

## Out of scope

- Customer accounts / login, server-side carts, RLS.
- WhatsApp Business/Cloud API auto-send (paid). The `wa.me` deep link is used.
- Payment processing, inventory decrement on order, order history/persistence.

## Testing

No automated test suite exists in this project. Verification is manual:
- Add/remove items, adjust quantity, confirm total and badge update.
- Confirm cart survives a page refresh.
- Confirm sold-out / price-on-request items cannot be added.
- Confirm the generated `wa.me` link opens WhatsApp with a correctly formatted,
  encoded message addressed to the configured number.
