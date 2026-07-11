# Checkout Payment Options — Design

**Date:** 2026-07-11
**Status:** Approved (design), pending spec review
**Area:** Public storefront checkout (`src/components/customer/CheckoutModal.jsx`), `customer_orders` table, admin `CustomerOrders.jsx`

## Problem

Today the storefront checkout collects delivery details, logs the order to
`customer_orders`, and hands off to WhatsApp with a pre-filled message. There is
no notion of *how* the customer pays. We want to let customers pay up front via
UPI, or choose Cash on Delivery, and give a way to attach payment proof.

## Goals

- Let the customer choose a payment method at checkout: **UPI (QR)** or **Cash on Delivery**.
- For UPI, show a static UPI QR + the order total so the customer can pay immediately.
- Let the customer optionally **upload a payment screenshot** (PhonePe/Paytm, which allow screenshots).
- Support customers who **cannot** screenshot (GPay disables it) by letting them skip the upload and share their receipt directly in the WhatsApp chat.
- Record the chosen method, a payment status, and any proof on the order, and surface it in the admin view.
- WhatsApp remains the final handoff in every path.

## Non-goals (YAGNI)

- No payment gateway / real-time payment verification (no Razorpay/Cashfree/webhooks).
- No dynamic per-order QR — a single static UPI QR; the customer types the amount.
- No admin UI to change the QR (it never changes; it lives as a repo asset).
- No enforced payment before order submission — UPI proof is always optional; trust + WhatsApp follow-up handle disputes.

## Flow

The `CheckoutModal` becomes a two-step modal (details → payment).

1. **Details step** — name / phone / address / landmark / location. Unchanged from today. Submitting advances to the payment step (does **not** log or open WhatsApp yet).
2. **Payment step** — customer picks a method:
   - **Cash on Delivery (COD)**
     - Log the order with `payment_method: 'cod'`, `payment_status: 'unpaid'`.
     - Open WhatsApp with a `Payment: Cash on Delivery` line. Clear cart.
   - **Pay via UPI (QR)**
     - Show the static UPI QR image, the UPI ID text (`aadhithyaraja180-2@oksbi`) as a fallback, and the total shown large (`Pay ₹850`). Note that the customer must enter the amount themselves (static QR).
     - Optional: **Upload payment screenshot** button → uploads the image to the `payment-proofs` bucket, stores `payment_proof_url` / `payment_proof_path`. Shows a "screenshot attached ✓" state.
     - Primary action: **"I've paid — Send order on WhatsApp"** → log the order with `payment_method: 'upi'`, `payment_status: 'claimed'`, proof URL/path if uploaded. Open WhatsApp with a `Payment: Paid via UPI` line (plus `(screenshot uploaded)` when a proof exists). Clear cart.
     - GPay users simply skip the upload and share their GPay receipt in the WhatsApp chat that opens.

The three options the user asked for map to: **UPI + uploaded screenshot**, **UPI + share receipt on WhatsApp** (same method, upload skipped), and **COD**.

### Order logging point

Logging to `customer_orders` happens once, at the moment the WhatsApp handoff
fires (both COD and UPI paths), preserving today's fire-and-forget, best-effort
insert (a logging failure must never block the WhatsApp handoff or the popup).
The screenshot upload, when used, completes *before* the insert so the proof
URL can be included.

## Data model

### `customer_orders` — new columns

```sql
ALTER TABLE customer_orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN payment_proof_url  text,
  ADD COLUMN payment_proof_path text;

ALTER TABLE customer_orders
  ADD CONSTRAINT customer_orders_payment_method_chk
    CHECK (payment_method IN ('upi','cod')),
  ADD CONSTRAINT customer_orders_payment_status_chk
    CHECK (payment_status IN ('unpaid','claimed')),
  ADD CONSTRAINT customer_orders_proof_url_len
    CHECK (payment_proof_url IS NULL OR char_length(payment_proof_url) <= 500),
  ADD CONSTRAINT customer_orders_proof_path_len
    CHECK (payment_proof_path IS NULL OR char_length(payment_proof_path) <= 300);
```

- `payment_method` — `'upi' | 'cod'`.
- `payment_status` — `'unpaid'` (COD) | `'claimed'` (customer says they paid via UPI, with or without proof). Deliberately *not* `'paid'`: we cannot verify payment, only that the customer claimed it.
- `payment_proof_url` / `payment_proof_path` — nullable; the uploaded screenshot's public-object URL and storage path (mirrors the `vendor_orders` `bill_url` / `bill_path` pattern).

Widen the anon INSERT grant to include the new columns:

```sql
GRANT INSERT (customer_name, phone, address, landmark, location_url, items, total,
              payment_method, payment_status, payment_proof_url, payment_proof_path)
  ON customer_orders TO anon;
```

RLS otherwise unchanged: anon may INSERT only (never SELECT — PII); authenticated has full access.

### Storage: `payment-proofs` bucket

- New **private** bucket `payment-proofs`.
- Anon gets **INSERT (upload) only** — no public read, no listing, consistent with the 2026-07-01 hardening that removed anonymous file enumeration. The URL is stored on the order for admin retrieval.
- Client-side validation before upload: image MIME type only, size cap (e.g. ≤ 5 MB).
- Upload path convention: `payment-proofs/<yyyy>/<uuid>.<ext>` (no PII in the path).

> **Bucket privacy note:** unlike `order-bills` (public bucket, direct-URL access),
> payment proofs are more sensitive. The bucket is private; admins read proofs via
> authenticated Supabase access (signed URL or authenticated download) on the
> `CustomerOrders` page rather than a bare public URL. `payment_proof_url` stores
> the object reference used to build that access.

## QR asset

- The provided static UPI QR PNG is copied into the repo as `src/assets/upi-qr.png` and imported by the payment step.
- The UPI ID `aadhithyaraja180-2@oksbi` is shown as selectable text beneath the QR as a fallback for customers who can't scan.

## WhatsApp message

`buildMessage()` gains a `Payment:` line appended to the details block:

- COD → `Payment: Cash on Delivery`
- UPI → `Payment: Paid via UPI` (and ` (screenshot uploaded)` when a proof exists)

## Admin view — `CustomerOrders.jsx`

- Show a payment badge per order: method (`UPI` / `COD`) + status (`claimed` / `unpaid`).
- When `payment_proof_url` is present, show a thumbnail / "View screenshot" link that opens the proof via authenticated access.

## Error handling

- Screenshot upload failure → surface an inline error on the payment step; the customer can retry or proceed without a screenshot (upload is optional).
- Order-insert failure → unchanged best-effort behaviour (logged to console, never blocks WhatsApp handoff).
- Missing `VITE_WHATSAPP_NUMBER` → existing "Ordering is temporarily unavailable" guard still applies, checked before the payment step is reachable.

## Testing

No automated test suite exists in this project. Manual verification:

- COD path logs order with `cod` / `unpaid` and correct WhatsApp line.
- UPI path without upload logs `upi` / `claimed`, null proof, correct WhatsApp line.
- UPI path with upload stores proof, order carries the URL/path, WhatsApp line notes the screenshot.
- Anon (logged-out) storefront can insert new columns and upload to `payment-proofs` but cannot read `customer_orders` or list the bucket.
- Admin `CustomerOrders` renders badges and opens the proof.

## Files touched

- `src/components/customer/CheckoutModal.jsx` — two-step modal, method selection, QR/payment step, upload.
- `src/assets/upi-qr.png` — new static QR asset.
- `src/pages/CustomerOrders.jsx` — payment badge + proof link.
- `supabase/schema.sql` — new migration (columns, constraints, grant, bucket + policies).
- `CLAUDE.md` — update `customer_orders` columns, note `payment-proofs` bucket.
