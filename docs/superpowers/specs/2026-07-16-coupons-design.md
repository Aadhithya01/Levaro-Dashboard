# Coupons at checkout

**Date:** 2026-07-16
**Surface:** Admin (`/coupons`) + storefront checkout (`CheckoutModal`).

## Goal

Customers enter a coupon code at checkout to get a discount. Codes are stored in a
`coupons` table and managed by an admin page. The discounted total flows into the UPI
amount, the WhatsApp message, and the logged order.

## Decisions

- Discount type per coupon: **percent** or **fixed ₹**.
- Rules: **active** toggle, **expiry_date**, **min_order**, **max_uses** (total, best-effort).
- **Admin page** `/coupons` to manage them.
- One coupon per order (no stacking). Discount never exceeds cart total.

## Data — `coupons` (dev + live)

```
id            uuid pk
code          text not null              -- unique case-insensitively
discount_type text check in (percent,fixed)
discount_value numeric not null >= 0
min_order     numeric not null default 0
max_uses      integer null (null=unlimited) check > 0
used_count    integer not null default 0
active        boolean not null default true
expiry_date   date null (null=never)
created_at    timestamptz default now()
unique index on upper(code)
```

RLS: authenticated full access; **anon has no table access** (REVOKE). Anon uses coupons
only through the RPCs below, so codes can't be enumerated.

## RPCs (SECURITY DEFINER, search_path locked, EXECUTE to anon+authenticated)

- `validate_coupon(p_code text, p_total numeric) → jsonb`
  `{ valid, discount, code, discount_type, discount_value, message }`. Checks existence,
  active, expiry, usage limit, min order. Computes discount (percent → total×value/100;
  fixed → value), capped at total, rounded to whole ₹. Returns a friendly `message`.
- `redeem_coupon(p_code text) → void` — increments `used_count` where active and under
  `max_uses`. Best-effort, called on order placement.

## `customer_orders` additions

`coupon_code text`, `discount numeric not null default 0`. Stored `total` becomes the
**final payable** (after discount). Anon INSERT grant widened to include both new columns.

## Admin — `src/pages/CouponsAdmin.jsx` (route `/coupons`, Navbar link) + `AddCouponModal`

- List coupons: code, type/value, min order, expiry, uses `used_count/max_uses`, active
  toggle, delete. Direct Supabase (authenticated has full access).
- Add modal: code (auto-uppercased), type select, value, min order, expiry (optional),
  max uses (optional), active. Insert into `coupons`.

## Checkout — `CheckoutModal`

- Details step gets a "Have a coupon?" input + Apply. Apply calls
  `supabase.rpc('validate_coupon', { p_code, p_total: total })`. On valid → store
  `{ code, discount }`, show breakdown (Subtotal / Coupon −₹ / Total). On invalid → show message.
- `payable = max(0, total − discount)` replaces `total` in: the summary line, the payment
  step amount, `upiPayUrl`, `buildMessage` total (+ a coupon line), and the
  `customer_orders` insert (`total: payable, discount, coupon_code`).
- On placement, fire `supabase.rpc('redeem_coupon', { p_code: code })` (fire-and-forget).

## Non-goals

- No stacking, no per-customer limits. Usage limit is best-effort (WhatsApp-based orders).
- Not dev-only: table + RPCs live in dev and live.
