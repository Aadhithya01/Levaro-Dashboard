# Customer Orders — Design (2026-07-01)

## Problem
Customer storefront checkout (`CheckoutModal`) only opens a pre-filled WhatsApp
message — nothing is persisted. The admin app has no record of customer orders
(the existing "Orders" page is `vendor_orders`, a different thing). Owner wants
customer orders captured and viewable in the admin app.

## Decisions
- **Log timing:** save the order the moment the customer taps "Send Order on
  WhatsApp", then open WhatsApp. WhatsApp can't confirm send, so this captures
  every attempt; abandoned ones can be marked Cancelled.
- **Status workflow:** `new → confirmed → delivered`, plus `cancelled`.
- **No stock impact:** an order is a request, not a sale. It never touches
  `purchases`/`sales`. The actual sale is still recorded separately on fulfilment.

## Data model — `customer_orders`
| column | type | notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| customer_name | text | |
| phone | text | |
| address | text | |
| landmark | text | nullable |
| location_url | text | nullable (Google Maps link) |
| items | jsonb | `[{product_id, name, code, color, variant_id, qty, price}]` |
| total | numeric | |
| status | text | default `'new'`, CHECK in (new, confirmed, delivered, cancelled) |
| created_at | timestamptz | default `now()` |

Length-cap CHECK constraints for spam mitigation (name ≤100, phone ≤20,
address ≤1000, landmark ≤200, location_url ≤500, jsonb array ≤50 items).

### RLS
- `anon` **INSERT only** (customers create orders) — column-grant + policy.
- `authenticated` full access (SELECT/UPDATE/DELETE) — admin manages.
- **No `anon` SELECT** — phone/address are PII, must never be public-readable.

## Checkout change (`src/components/customer/CheckoutModal.jsx`)
- Import `supabase`.
- On submit, after phone validation: `insert` into `customer_orders` with cart
  items mapped to the jsonb shape and `status: 'new'`.
- DB failure must NOT block the customer — on error, `console.error` and still
  open WhatsApp. Logging is best-effort.

## Admin page (`/customer-orders`, auth-gated)
- New `src/pages/CustomerOrders.jsx`, route in `App.jsx`, nav link in
  `Navbar`/`MobileNav`.
- Card-per-order layout: customer name, phone (tel link), address, optional
  location link; item list + total; status pill changed inline (updates DB);
  delete option.
- Filter chips: All / New / Confirmed / Delivered / Cancelled.
- Follows existing fetch-in-component pattern (`fetchData()` in `useEffect`).

## Out of scope
Editing order line items, customer accounts/auth, notifications, analytics.
