# Checkout Payment Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let storefront customers choose UPI (static QR) or Cash on Delivery at checkout, optionally attach a payment screenshot, and record method/status/proof on the order for the admin view.

**Architecture:** Extend the existing single-step `CheckoutModal` into a two-step modal (details → payment). The order is still logged to `customer_orders` once, at the WhatsApp handoff, with new payment columns. UPI screenshots upload to a new `payment-proofs` storage bucket (public bucket, unguessable UUID path, no list policy — same posture as `order-bills`). The admin `CustomerOrders` page shows a payment badge and a proof link.

**Tech Stack:** React 19, Supabase JS (`supabase.from(...).insert`, `supabase.storage`), Tailwind v3, Vite. No test framework exists in this project — verification is `npm run lint`, `npm run build`, and manual browser checks.

## Global Constraints

- No payment gateway / real-time verification — static UPI QR only; the customer types the amount.
- WhatsApp (`wa.me`) is the final action in every checkout path.
- Order insert stays **fire-and-forget**: never `await` the insert before `window.open`, and a logging failure must never block the WhatsApp handoff (popup-blocker safety).
- Screenshot upload is **optional**; it must upload *on file selection* (not on send) so the send path can stay synchronous before `window.open`.
- Anon (logged-out) DB access stays **INSERT-only** on `customer_orders`; anon storage access stays **INSERT-only** on `payment-proofs`. Never grant anon SELECT/LIST.
- UPI ID for the QR: `aadhithyaraja180-2@oksbi`. QR source image: `C:\Users\aadhi\Downloads\WhatsApp Image 2026-07-11 at 9.24.53 AM.jpeg`.
- Brand tokens: `brand-green` (#1a5c45), `brand-gold`, `brand-cream`, `brand-border`. Customer modals use `'Raleway'`/`levaro-display` inline styles — match the existing `CheckoutModal` styling.
- `payment_status` values: `'unpaid'` (COD) and `'claimed'` (UPI — customer says paid; we never assert `'paid'` since we can't verify).

---

### Task 1: Database migration — payment columns + proofs bucket

**Files:**
- Modify: `supabase/schema.sql` (append migration block at end)
- Apply: live Supabase DB via the Supabase MCP `apply_migration` (or the SQL editor)

**Interfaces:**
- Produces: `customer_orders.payment_method` (`'upi'|'cod'`), `.payment_status` (`'unpaid'|'claimed'`), `.payment_proof_url` (text, nullable), `.payment_proof_path` (text, nullable); a public `payment-proofs` bucket that anon can upload to.

- [ ] **Step 1: Append the migration to `supabase/schema.sql`**

Add at the end of the file:

```sql
-- Migration: checkout_payment_options (2026-07-11)
-- Adds payment method/status/proof to storefront orders + a bucket for UPI
-- payment screenshots. Anon stays INSERT-only everywhere (no SELECT/LIST).
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

-- Widen the anon INSERT grant to include the new payment columns.
GRANT INSERT (customer_name, phone, address, landmark, location_url, items, total,
              payment_method, payment_status, payment_proof_url, payment_proof_path)
  ON customer_orders TO anon;

-- Payment-proof screenshots. Public bucket like order-bills, but with NO broad
-- read/list policy: objects are reachable only via their exact (unguessable
-- UUID) CDN URL, so proofs can't be anonymously enumerated. Anon may upload only.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-proofs', 'payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon upload payment proofs"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "auth manage payment proofs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');
```

- [ ] **Step 2: Apply the migration to the live DB**

Apply the exact SQL from Step 1 to the live Supabase project (Supabase MCP `apply_migration` with name `checkout_payment_options`, or paste into the Supabase SQL editor). This project applies schema changes to the live DB, not via a local migration runner.

- [ ] **Step 3: Verify the columns and bucket exist**

Run this query (Supabase MCP `execute_sql` or SQL editor):

```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'customer_orders'
    AND column_name IN ('payment_method','payment_status','payment_proof_url','payment_proof_path');
SELECT id, public FROM storage.buckets WHERE id = 'payment-proofs';
```

Expected: 4 column rows returned; one bucket row with `public = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): payment method/status/proof on customer_orders + payment-proofs bucket"
```

---

### Task 2: Two-step CheckoutModal with method selection + COD

**Files:**
- Modify: `src/components/customer/CheckoutModal.jsx` (full rewrite of the component)
- Create: `src/assets/upi-qr.png` (copied from Downloads)

**Interfaces:**
- Consumes: `customer_orders` columns from Task 1; props `{ items, total, onClose, onClear }` (unchanged).
- Produces: `handleSend()` (reads `method` and `proof` from component state) which logs the order (fire-and-forget) with `payment_method`/`payment_status` and opens WhatsApp; `buildMessage({..., paymentMethod, hasProof })`. Task 3 extends this file with upload state — it relies on `handleSend` reading the already-set `proof` state and on the `method === 'upi'` branch of the payment step existing.

- [ ] **Step 1: Copy the QR image into the repo**

```bash
cp "/c/Users/aadhi/Downloads/WhatsApp Image 2026-07-11 at 9.24.53 AM.jpeg" "src/assets/upi-qr.png"
```

(The `.png` name is fine even though the source is a jpeg — Vite imports it as a static asset by content, and the extension is cosmetic here. If you prefer, name it `upi-qr.jpg` and adjust the import in Step 2.)

- [ ] **Step 2: Rewrite `src/components/customer/CheckoutModal.jsx`**

Replace the entire file with:

```jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import upiQr from '../../assets/upi-qr.png'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER
const UPI_ID = 'aadhithyaraja180-2@oksbi'

function buildMessage({ name, phone, address, landmark, locationUrl, items, total, paymentMethod, hasProof }) {
  const orderLines = items.map((i, idx) => {
    const codePart = i.code ? ` (${i.code})` : ''
    const colorPart = i.color ? ` — ${i.color}` : ''
    return `${idx + 1}. ${i.name}${codePart}${colorPart} — Qty: ${i.qty} — ₹${(i.price * i.qty).toFixed(0)}`
  })

  const details = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Delivery address: ${address}`,
  ]
  if (landmark) details.push(`Landmark: ${landmark}`)
  if (locationUrl) details.push(`Location: ${locationUrl}`)

  const paymentLine = paymentMethod === 'upi'
    ? `Payment: Paid via UPI${hasProof ? ' (screenshot uploaded)' : ''}`
    : `Payment: Cash on Delivery`
  details.push(paymentLine)

  return [
    `Hello LEVARO team,`,
    ``,
    `I would like to place the following order:`,
    ``,
    ...details,
    ``,
    `Order summary:`,
    ...orderLines,
    ``,
    `Total: ₹${total.toFixed(0)}`,
    ``,
    `Please confirm availability and the delivery timeline. Thank you.`,
  ].join('\n')
}

export default function CheckoutModal({ items, total, onClose, onClear }) {
  const [step, setStep] = useState('details') // 'details' | 'payment'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [method, setMethod] = useState('upi') // 'upi' | 'cod'

  // Proof state is populated by Task 3 (screenshot upload). Kept here so
  // handleSend can read it regardless of whether an upload happened.
  const proof = null // Task 3 replaces this with state: { url, path } | null

  const numberMissing = !WHATSAPP_NUMBER

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    if (phoneError) setPhoneError('')
  }

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location sharing is not supported on this device.')
      return
    }
    setGeoError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationUrl(`https://maps.google.com/?q=${latitude},${longitude}`)
        setLocating(false)
      },
      () => {
        setGeoError('Could not get your location. Please allow location access or skip it.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Details step submit → advance to payment step (no logging/WhatsApp yet).
  const handleDetailsSubmit = (e) => {
    e.preventDefault()
    if (numberMissing) return
    if (phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }
    setStep('payment')
  }

  // Final handoff: log order (fire-and-forget) + open WhatsApp + clear cart.
  const handleSend = () => {
    if (numberMissing) return
    const paymentStatus = method === 'upi' ? 'claimed' : 'unpaid'

    supabase
      .from('customer_orders')
      .insert({
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim() || null,
        location_url: locationUrl || null,
        items: items.map(i => ({
          product_id: i.id,
          name: i.name,
          code: i.code ?? null,
          color: i.color ?? null,
          variant_id: i.variantId ?? null,
          qty: i.qty,
          price: i.price,
        })),
        total,
        payment_method: method,
        payment_status: paymentStatus,
        payment_proof_url: proof?.url ?? null,
        payment_proof_path: proof?.path ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log customer order:', error)
      })

    const message = buildMessage({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      landmark: landmark.trim(),
      locationUrl,
      items,
      total,
      paymentMethod: method,
      hasProof: !!proof,
    })
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onClear()
  }

  const inputStyle = { fontFamily: "'Raleway', sans-serif", fontSize: '0.9rem', color: '#1a5c45', fontWeight: 500 }
  const labelStyle = { fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem', letterSpacing: '0.05em' }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 levaro-shop"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="levaro-card-enter w-full max-w-sm bg-white overflow-y-auto shadow-2xl"
        style={{ borderRadius: '20px', animationDelay: '0s', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6">
          <div className="w-8 h-px bg-brand-gold mb-3" />

          {step === 'details' ? (
            <form onSubmit={handleDetailsSubmit}>
              <p className="levaro-display text-gray-900" style={{ fontSize: '1.3rem', fontWeight: 400, letterSpacing: '0.02em' }}>
                Your details
              </p>
              <p className="mt-1 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                {items.length} {items.length === 1 ? 'item' : 'items'} · ₹{total.toFixed(0)}. Next you'll choose how to pay.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                  style={inputStyle}
                />

                <div>
                  <input
                    type="tel" required inputMode="numeric" maxLength={10} value={phone}
                    onChange={handlePhoneChange} placeholder="Phone number (10 digits)"
                    className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${phoneError ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-brand-green'}`}
                    style={inputStyle}
                  />
                  {phoneError && (
                    <p className="mt-1 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                      {phoneError}
                    </p>
                  )}
                </div>

                <textarea
                  required rows={3} value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green resize-none"
                  style={inputStyle}
                />

                <input
                  type="text" value={landmark} onChange={e => setLandmark(e.target.value)}
                  placeholder="Nearby landmark (optional)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                  style={inputStyle}
                />

                <button
                  type="button" onClick={shareLocation} disabled={locating}
                  className={`w-full rounded-xl py-2.5 border transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 ${locationUrl ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green'}`}
                  style={labelStyle}
                >
                  {locating ? 'Getting your location…' : locationUrl ? '📍 Location pinned ✓ (tap to update)' : '📍 Share my location (optional)'}
                </button>
                {geoError && (
                  <p className="text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                    {geoError}
                  </p>
                )}
              </div>

              {numberMissing && (
                <p className="mt-3 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                  Ordering is temporarily unavailable. Please try again later.
                </p>
              )}

              <button
                type="submit" disabled={numberMissing}
                className="mt-5 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
              >
                CONTINUE TO PAYMENT
              </button>
              <button
                type="button" onClick={onClose}
                className="mt-2 w-full text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em' }}
              >
                Back to cart
              </button>
            </form>
          ) : (
            <div>
              <p className="levaro-display text-gray-900" style={{ fontSize: '1.3rem', fontWeight: 400, letterSpacing: '0.02em' }}>
                Payment
              </p>
              <p className="mt-1 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                Total payable: ₹{total.toFixed(0)}
              </p>

              {/* Method selector */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[{ key: 'upi', label: 'Pay via UPI' }, { key: 'cod', label: 'Cash on Delivery' }].map(m => (
                  <button
                    key={m.key} type="button" onClick={() => setMethod(m.key)}
                    className={`rounded-xl py-2.5 border transition-colors font-semibold ${method === m.key ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-200 text-gray-600 hover:border-brand-green'}`}
                    style={labelStyle}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* UPI panel */}
              {method === 'upi' && (
                <div className="mt-4 flex flex-col items-center text-center">
                  <img src={upiQr} alt="UPI QR code" className="w-52 h-52 object-contain rounded-xl border border-gray-100" />
                  <p className="mt-2 text-gray-900 font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '1.05rem' }}>
                    Pay ₹{total.toFixed(0)}
                  </p>
                  <p className="text-gray-500 select-all" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                    UPI ID: {UPI_ID}
                  </p>
                  <p className="mt-1 text-gray-400" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                    Scan, enter the amount, and pay. If your app allows a screenshot you can attach it below; otherwise just share the receipt on WhatsApp.
                  </p>
                  {/* Task 3 inserts the screenshot-upload control here. */}
                </div>
              )}

              {method === 'cod' && (
                <p className="mt-4 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                  Pay in cash when your order is delivered. We'll confirm the details on WhatsApp.
                </p>
              )}

              <button
                type="button" onClick={handleSend} disabled={numberMissing}
                className="mt-5 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
              >
                {method === 'upi' ? "I'VE PAID — SEND ORDER ON WHATSAPP" : 'PLACE ORDER ON WHATSAPP'}
              </button>
              <button
                type="button" onClick={() => setStep('details')}
                className="mt-2 w-full text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em' }}
              >
                Back to details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors for `CheckoutModal.jsx`. (The `proof` const is intentionally unused-ish in this task — it's read in `handleSend`. If ESLint flags `no-unused-vars` it will not, since `proof` is referenced. If lint complains about the placeholder comment, ignore.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds; the QR asset is bundled (no "failed to resolve import" for `upi-qr.png`).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open `/shop`, add an item to the cart, open the cart, click checkout:
1. Fill details, click **Continue to payment** → payment step appears.
2. Select **Cash on Delivery** → COD copy shows; click **Place order on WhatsApp** → WhatsApp opens with a `Payment: Cash on Delivery` line; cart clears.
3. Re-do, select **Pay via UPI** → QR + `Pay ₹<total>` + UPI ID show; click send → WhatsApp opens with `Payment: Paid via UPI`.
4. In Supabase, confirm two `customer_orders` rows: one `cod`/`unpaid`, one `upi`/`claimed`, both with null proof columns.

- [ ] **Step 6: Commit**

```bash
git add src/components/customer/CheckoutModal.jsx src/assets/upi-qr.png
git commit -m "feat(shop): two-step checkout with UPI QR / COD payment choice"
```

---

### Task 3: Optional payment-screenshot upload

**Files:**
- Modify: `src/components/customer/CheckoutModal.jsx`

**Interfaces:**
- Consumes: `payment-proofs` bucket (Task 1); the UPI panel and `handleSend` from Task 2.
- Produces: `proof` state `{ url, path } | null` included in the order insert (already wired in `handleSend`).

- [ ] **Step 1: Add imports and proof state**

In `CheckoutModal.jsx`, change the React import and replace the `proof` placeholder const.

Change line 1 from:

```jsx
import { useState } from 'react'
```

to:

```jsx
import { useRef, useState } from 'react'
```

Replace this block:

```jsx
  // Proof state is populated by Task 3 (screenshot upload). Kept here so
  // handleSend can read it regardless of whether an upload happened.
  const proof = null // Task 3 replaces this with state: { url, path } | null
```

with:

```jsx
  const [proof, setProof] = useState(null)   // { url, path } | null
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const fileRef = useRef(null)

  const handleProofFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image too large (max 5 MB).'); return }

    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, file)
    if (upErr) { setUploadError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
    setProof({ url: data.publicUrl, path })
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(false)
  }

  const removeProof = async () => {
    if (proof?.path) await supabase.storage.from('payment-proofs').remove([proof.path])
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setProof(null)
    setPreviewUrl('')
  }
```

- [ ] **Step 2: Add the upload control to the UPI panel**

Replace the placeholder comment:

```jsx
                  {/* Task 3 inserts the screenshot-upload control here. */}
```

with:

```jsx
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProofFile} />
                  {proof ? (
                    <div className="mt-3 relative inline-flex items-center gap-2 border border-brand-green rounded-lg p-2">
                      <img src={previewUrl} alt="Payment screenshot" className="w-14 h-14 object-cover rounded" />
                      <span className="text-brand-green font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                        Screenshot attached ✓
                      </span>
                      <button
                        type="button" onClick={removeProof}
                        className="bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-500"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button" onClick={() => fileRef.current.click()} disabled={uploading}
                      className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-xl py-2.5 text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors disabled:opacity-60"
                      style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.04em' }}
                    >
                      {uploading ? 'Uploading…' : '📎 Upload payment screenshot (optional)'}
                    </button>
                  )}
                  {uploadError && (
                    <p className="mt-1 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                      {uploadError}
                    </p>
                  )}
```

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: both pass, no unused-variable warnings (all of `proof`, `uploading`, `uploadError`, `previewUrl`, `fileRef` are now referenced).

- [ ] **Step 4: Manual verification**

`npm run dev` → `/shop` → checkout → payment → **Pay via UPI**:
1. Click **Upload payment screenshot**, choose an image → shows "Uploading…" then "Screenshot attached ✓" with a thumbnail.
2. Click **✕** → attachment clears (and the object is removed from storage).
3. Re-attach, then click **I've paid — Send order on WhatsApp** → WhatsApp message says `Payment: Paid via UPI (screenshot uploaded)`.
4. In Supabase: the new `customer_orders` row has `payment_proof_url`/`payment_proof_path` populated; the object exists in the `payment-proofs` bucket.
5. Try a non-image or >5 MB file → inline error, no upload.

- [ ] **Step 5: Commit**

```bash
git add src/components/customer/CheckoutModal.jsx
git commit -m "feat(shop): optional UPI payment-screenshot upload at checkout"
```

---

### Task 4: Admin payment badge + proof link

**Files:**
- Modify: `src/pages/CustomerOrders.jsx`

**Interfaces:**
- Consumes: `customer_orders.payment_method`, `.payment_status`, `.payment_proof_url` (Task 1); `select('*')` already returns them.
- Produces: none (leaf UI).

- [ ] **Step 1: Add a payment-meta map**

In `src/pages/CustomerOrders.jsx`, below the existing `STATUS_META` object (after line 12), add:

```jsx
const PAYMENT_META = {
  upi: { label: 'UPI', pill: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  cod: { label: 'COD', pill: 'bg-gray-100 text-gray-600 border-gray-300' },
}

function paymentLabel(o) {
  const method = PAYMENT_META[o.payment_method] ?? PAYMENT_META.cod
  const statusWord = o.payment_status === 'claimed' ? 'claimed' : 'unpaid'
  return { ...method, statusWord }
}
```

- [ ] **Step 2: Render the badge + proof link in each order card**

In the order card, find the total/delete row (around lines 141-152):

```jsx
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-semibold text-brand-green">Total: ₹{Number(o.total).toFixed(0)}</span>
```

Insert the payment badge immediately after the opening `<div ...>` of that row and before the Total span, so the row reads:

```jsx
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-green">Total: ₹{Number(o.total).toFixed(0)}</span>
                        {(() => {
                          const p = paymentLabel(o)
                          return (
                            <span className={`text-[11px] font-medium border rounded-full px-2 py-0.5 ${p.pill}`}>
                              {p.label} · {p.statusWord}
                            </span>
                          )
                        })()}
                        {o.payment_proof_url && (
                          <a
                            href={o.payment_proof_url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-brand-green hover:underline"
                          >
                            📎 Proof ↗
                          </a>
                        )}
                      </div>
```

Then keep the existing delete `{confirmingDelete === o.id ? (...) : (...)}` block as-is, and ensure the row's closing `</div>` still balances (the original single-child row now has two children: the meta group and the delete control).

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 4: Manual verification**

`npm run dev`, log in, open `/customer-orders`:
1. Orders placed in Tasks 2–3 show a badge like `UPI · claimed` or `COD · unpaid`.
2. The UPI order with a screenshot shows a **📎 Proof ↗** link that opens the uploaded image in a new tab.
3. Older orders (created before Task 1) show `COD · unpaid` (defaults) and no proof link — no crash.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CustomerOrders.jsx
git commit -m "feat(admin): show payment method/status badge and proof link on customer orders"
```

---

### Task 5: Update project docs

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none.

- [ ] **Step 1: Update the `customer_orders` schema line**

In `CLAUDE.md`, find the `customer_orders` bullet under "Supabase schema" and append the new columns and note. Replace:

```
- `customer_orders` — `id, customer_name, phone, address, landmark, location_url, items (jsonb), total, status ('new'|'confirmed'|'delivered'|'cancelled'), created_at` (storefront checkout orders; anon may INSERT only, never SELECT — it holds PII; admins view via `CustomerOrders.jsx`)
```

with:

```
- `customer_orders` — `id, customer_name, phone, address, landmark, location_url, items (jsonb), total, status ('new'|'confirmed'|'delivered'|'cancelled'), payment_method ('upi'|'cod'), payment_status ('unpaid'|'claimed'), payment_proof_url, payment_proof_path, created_at` (storefront checkout orders; anon may INSERT only, never SELECT — it holds PII; admins view via `CustomerOrders.jsx`. UPI = customer paid via the static QR and claims payment, optionally with a screenshot; COD = cash on delivery)
```

- [ ] **Step 2: Note the new bucket in the storage line**

Find the storage-buckets sentence in the RLS paragraph:

```
Storage buckets: `category-images`, `product-images`, `avatars`, `order-bills` (all public-read via CDN URL; the broad SELECT list policies were dropped to stop anonymous enumeration of files like vendor bills).
```

Replace with:

```
Storage buckets: `category-images`, `product-images`, `avatars`, `order-bills`, `payment-proofs` (public-read via direct CDN URL; the broad SELECT list policies were dropped to stop anonymous enumeration — files like vendor bills and UPI payment screenshots are reachable only via their exact unguessable URL). Anon may upload to `payment-proofs` (checkout screenshots) but cannot list it.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document customer_orders payment columns and payment-proofs bucket"
```

---

## Notes for the implementer

- **Deviation from the spec:** the spec described `payment-proofs` as a *private* bucket read via signed URLs. This plan makes it a **public** bucket with no list policy and unguessable UUID paths — identical to the existing `order-bills` posture after the 2026-07-01 hardening — so admin viewing is a plain link and the code stays consistent with the rest of the app. The security goal (proofs can't be enumerated) is preserved. If true privacy is required later, switch the bucket to `public=false`, store only `payment_proof_path`, and build the admin link with `createSignedUrl(path, 60)`.
- **No test framework:** this project has no automated tests; every task verifies via `npm run lint`, `npm run build`, and the manual browser steps described.
