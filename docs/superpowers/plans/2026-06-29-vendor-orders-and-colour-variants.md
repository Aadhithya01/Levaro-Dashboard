# Vendor Order Log & Per-Colour Product Variants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone vendor order log (with bill-copy upload) and per-colour product variants with per-colour stock, shown and selectable on the customer storefront.

**Architecture:** Follows the existing app conventions exactly — no service layer; each page defines a `fetchX()` called in `useEffect` and passed to modals as `onAdded`/`onUpdated`/`onDeleted`; every mutation lives in a modal that calls Supabase directly. Schema changes go through Supabase MCP `apply_migration` (project `cergignhfwrkxgamzfwd`) and are mirrored into `supabase/schema.sql`. Per-colour stock is derived (not stored): a colour's stock = Σ its `purchases.quantity` − Σ its `sales.quantity_sold`, via a new nullable `variant_id` on `purchases` and `sales`.

**Tech Stack:** React 19, Vite, React Router v7, Tailwind v3, Supabase (DB + Storage), no test framework (verify via `npm run lint`, `npm run build`, and manual checks — matching this repo's convention).

**Spec:** `docs/superpowers/specs/2026-06-29-vendor-orders-and-colour-variants-design.md`

---

## File Structure

**Feature 1 — Vendor orders**
- Create `src/pages/Orders.jsx` — orders list page (`/orders`), `fetchOrders()`, hosts the three modals.
- Create `src/components/AddOrderModal.jsx` — log a new order + bill upload.
- Create `src/components/EditOrderModal.jsx` — edit an order, optionally replace bill.
- Create `src/components/DeleteOrderModal.jsx` — delete an order + its bill file.
- Modify `src/App.jsx` — add `/orders` route.
- Modify `src/components/Navbar.jsx`, `src/components/MobileNav.jsx` — add Orders nav entry.

**Feature 2 — Colour variants**
- Modify `src/components/AddProductModal.jsx` — colour checkbox + repeater + per-colour purchases.
- Modify `src/components/EditProductModal.jsx` — colours section (add / rename / replace photo / remove).
- Modify `src/components/AddPurchaseModal.jsx`, `src/components/AddSaleModal.jsx` — colour selector.
- Modify `src/pages/ProductDetail.jsx` — load variants, per-colour stock table, pass variants to modals.
- Modify `src/contexts/CartContext.jsx` — colour-aware line identity (`cartLineKey`).
- Modify `src/components/customer/CartDrawer.jsx` — show colour, use line key.
- Modify `src/components/customer/CheckoutModal.jsx` — colour in WhatsApp message.
- Modify `src/pages/CustomerCategory.jsx` — variant query, per-colour stock, open modal to pick.
- Modify `src/components/customer/ProductMediaModal.jsx` — colour selector UI.

**Both**
- Modify `supabase/schema.sql` — append new tables/columns/buckets/policies.

---

# FEATURE 1 — VENDOR ORDER LOG

## Task 1: Database — `vendor_orders` table + `order-bills` bucket

**Files:**
- DB migration via MCP (no repo file)
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Apply the migration**

Call MCP `mcp__claude_ai_Supabase__apply_migration` with `project_id: "cergignhfwrkxgamzfwd"`, `name: "create_vendor_orders"`, and this `query`:

```sql
CREATE TABLE vendor_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name text NOT NULL,
  phone text,
  order_price numeric(10,2),
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  location text,
  bill_url text,
  bill_path text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access on vendor_orders"
  ON vendor_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-bills', 'order-bills', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload order bills"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-bills');

CREATE POLICY "authenticated users can delete order bills"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'order-bills');

CREATE POLICY "order bills are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-bills');
```

- [ ] **Step 2: Verify the table exists**

Call MCP `mcp__claude_ai_Supabase__list_tables` with `project_id: "cergignhfwrkxgamzfwd"`, `schemas: ["public"]`, `verbose: false`.
Expected: `public.vendor_orders` is listed.

- [ ] **Step 3: Mirror into `supabase/schema.sql`**

Append to the end of `supabase/schema.sql`:

```sql

-- Migration: create_vendor_orders (2026-06-29)
CREATE TABLE vendor_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name text NOT NULL,
  phone text,
  order_price numeric(10,2),
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  location text,
  bill_url text,
  bill_path text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access on vendor_orders"
  ON vendor_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-bills', 'order-bills', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): vendor_orders table and order-bills bucket"
```

---

## Task 2: `AddOrderModal`

**Files:**
- Create: `src/components/AddOrderModal.jsx`

- [ ] **Step 1: Create the modal**

Create `src/components/AddOrderModal.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddOrderModal({ onClose, onAdded }) {
  const [vendorName, setVendorName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [location, setLocation] = useState('')
  const [bill, setBill] = useState(null) // { file, previewUrl, isPdf }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const urlRef = useRef(null)

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50 MB)'); return }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const isPdf = file.type === 'application/pdf'
    const previewUrl = isPdf ? null : URL.createObjectURL(file)
    urlRef.current = previewUrl
    setBill({ file, previewUrl, isPdf })
  }

  function removeBill() {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    setBill(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!vendorName.trim()) { setError('Enter the vendor name'); return }
    setLoading(true)
    setError('')

    let bill_url = null
    let bill_path = null
    if (bill) {
      const ext = bill.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('order-bills').upload(path, bill.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('order-bills').getPublicUrl(path)
      bill_url = data.publicUrl
      bill_path = path
    }

    const { data: auth } = await supabase.auth.getUser()
    const { error: insErr } = await supabase.from('vendor_orders').insert({
      vendor_name: vendorName.trim(),
      phone: phone.trim() || null,
      order_price: orderPrice ? parseFloat(orderPrice) : null,
      quantity: quantity ? parseInt(quantity) : null,
      location: location.trim() || null,
      bill_url,
      bill_path,
      created_by: auth?.user?.id ?? null,
    })
    if (insErr) {
      if (bill_path) await supabase.storage.from('order-bills').remove([bill_path])
      setError(insErr.message); setLoading(false); return
    }
    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Log Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input type="text" required value={vendorName} onChange={e => setVendorName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. Sri Gold Suppliers" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 9876543210" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Price (₹)</label>
              <input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 12000" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. Chennai" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Copy <span className="text-gray-400 font-normal">(optional, image or PDF)</span></label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {bill ? (
              <div className="relative inline-flex items-center gap-2 border border-brand-border rounded-lg p-2">
                {bill.isPdf
                  ? <span className="text-sm text-brand-green">📄 {bill.file.name}</span>
                  : <img src={bill.previewUrl} alt="" className="w-16 h-16 object-cover rounded" />}
                <button type="button" onClick={removeBill}
                  className="bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-500">✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
                Attach bill copy
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Log Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors in `src/components/AddOrderModal.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddOrderModal.jsx
git commit -m "feat: AddOrderModal with bill upload"
```

---

## Task 3: `EditOrderModal` and `DeleteOrderModal`

**Files:**
- Create: `src/components/EditOrderModal.jsx`
- Create: `src/components/DeleteOrderModal.jsx`

- [ ] **Step 1: Create `EditOrderModal`**

Create `src/components/EditOrderModal.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditOrderModal({ order, onClose, onUpdated }) {
  const [vendorName, setVendorName] = useState(order.vendor_name ?? '')
  const [phone, setPhone] = useState(order.phone ?? '')
  const [orderPrice, setOrderPrice] = useState(order.order_price != null ? String(order.order_price) : '')
  const [quantity, setQuantity] = useState(order.quantity != null ? String(order.quantity) : '')
  const [location, setLocation] = useState(order.location ?? '')
  const [newBill, setNewBill] = useState(null) // { file, previewUrl, isPdf }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const urlRef = useRef(null)

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50 MB)'); return }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const isPdf = file.type === 'application/pdf'
    const previewUrl = isPdf ? null : URL.createObjectURL(file)
    urlRef.current = previewUrl
    setNewBill({ file, previewUrl, isPdf })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!vendorName.trim()) { setError('Enter the vendor name'); return }
    setLoading(true)
    setError('')

    let bill_url = order.bill_url
    let bill_path = order.bill_path
    if (newBill) {
      const ext = newBill.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('order-bills').upload(path, newBill.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('order-bills').getPublicUrl(path)
      bill_url = data.publicUrl
      bill_path = path
    }

    const { error: updErr } = await supabase.from('vendor_orders').update({
      vendor_name: vendorName.trim(),
      phone: phone.trim() || null,
      order_price: orderPrice ? parseFloat(orderPrice) : null,
      quantity: quantity ? parseInt(quantity) : null,
      location: location.trim() || null,
      bill_url,
      bill_path,
    }).eq('id', order.id)

    if (updErr) {
      if (newBill && bill_path) await supabase.storage.from('order-bills').remove([bill_path])
      setError(updErr.message); setLoading(false); return
    }
    // Update succeeded — remove the old bill file if it was replaced
    if (newBill && order.bill_path) {
      await supabase.storage.from('order-bills').remove([order.bill_path])
    }
    setLoading(false)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input type="text" required value={vendorName} onChange={e => setVendorName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Price (₹)</label>
              <input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Copy</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {newBill ? (
              <div className="inline-flex items-center gap-2 border border-brand-border rounded-lg p-2">
                {newBill.isPdf
                  ? <span className="text-sm text-brand-green">📄 {newBill.file.name}</span>
                  : <img src={newBill.previewUrl} alt="" className="w-16 h-16 object-cover rounded" />}
                <span className="text-xs text-gray-400">(new)</span>
              </div>
            ) : order.bill_url ? (
              <a href={order.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-green hover:underline">View current bill ↗</a>
            ) : (
              <p className="text-sm text-gray-400">No bill attached</p>
            )}
            <button type="button" onClick={() => fileRef.current.click()}
              className="mt-2 w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
              {order.bill_url || newBill ? 'Replace bill copy' : 'Attach bill copy'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `DeleteOrderModal`**

Create `src/components/DeleteOrderModal.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteOrderModal({ order, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    const { error: delErr } = await supabase.from('vendor_orders').delete().eq('id', order.id)
    if (delErr) { setError(delErr.message); setLoading(false); return }
    if (order.bill_path) await supabase.storage.from('order-bills').remove([order.bill_path])
    setLoading(false)
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2 text-brand-green">Delete Order</h2>
        <p className="text-sm text-gray-600 mb-4">
          Delete the order from <span className="font-semibold">{order.vendor_name}</span>? This also removes the attached bill. This cannot be undone.
        </p>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:opacity-90 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lint and commit**

Run: `npm run lint` → expected: no errors.

```bash
git add src/components/EditOrderModal.jsx src/components/DeleteOrderModal.jsx
git commit -m "feat: edit and delete order modals"
```

---

## Task 4: `Orders` page + route + navigation

**Files:**
- Create: `src/pages/Orders.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/MobileNav.jsx`

- [ ] **Step 1: Create the Orders page**

Create `src/pages/Orders.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddOrderModal from '../components/AddOrderModal'
import EditOrderModal from '../components/EditOrderModal'
import DeleteOrderModal from '../components/DeleteOrderModal'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Failed to fetch orders:', error); setLoading(false); return }
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-brand-green">Orders</h1>
          <button onClick={() => setShowAdd(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90">
            + Log Order
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No orders logged yet</p>
            <p className="text-gray-400 text-xs mb-5">Log your first vendor order to start tracking.</p>
            <button onClick={() => setShowAdd(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90">
              + Log Order
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-brand-green">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Vendor</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Phone</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Price (₹)</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Bill</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-brand-cream">
                    <td className="px-4 py-3 text-gray-700">{o.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium text-brand-green">{o.vendor_name}</td>
                    <td className="px-4 py-3 text-gray-700">{o.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{o.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{o.order_price != null ? `₹${Number(o.order_price).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      {o.bill_url
                        ? <a href={o.bill_url} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline text-xs">View ↗</a>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(o)} className="text-xs text-brand-green hover:underline mr-3">Edit</button>
                      <button onClick={() => setDeleting(o)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onAdded={fetchOrders} />}
      {editing && <EditOrderModal order={editing} onClose={() => setEditing(null)} onUpdated={fetchOrders} />}
      {deleting && <DeleteOrderModal order={deleting} onClose={() => setDeleting(null)} onDeleted={fetchOrders} />}
    </div>
  )
}
```

- [ ] **Step 2: Register the route in `src/App.jsx`**

Add the import after the `Tasks` import (line 9):

```jsx
import Orders from './pages/Orders'
```

Add the route after the `/tasks` route (line 25):

```jsx
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
```

- [ ] **Step 3: Add the desktop nav link in `src/components/Navbar.jsx`**

After the `tasksActive` line (line 16) add:

```jsx
  const ordersActive = pathname.startsWith('/orders')
```

After the Tasks `<Link>` block (closes at line 50) insert:

```jsx
          <Link
            to="/orders"
            className={`text-sm transition-colors ${ordersActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
          >
            Orders
          </Link>
```

- [ ] **Step 4: Add the mobile nav item in `src/components/MobileNav.jsx`**

Insert this object into the `items` array, after the Tasks item (after the object ending at line 35, before the Set Prices item):

```jsx
  {
    to: '/orders',
    label: 'Orders',
    isActive: p => p.startsWith('/orders'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
  },
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint` → expected: no errors.
Run: `npm run build` → expected: build succeeds.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, log in, then:
- Click **Orders** in the nav → `/orders` loads.
- **+ Log Order** → fill vendor name + a few fields, attach an image bill → save → row appears with **View ↗** opening the image.
- Repeat with a **PDF** bill → View opens the PDF.
- **Edit** a row, replace the bill → old file replaced, View shows the new one.
- **Delete** a row → it disappears.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Orders.jsx src/App.jsx src/components/Navbar.jsx src/components/MobileNav.jsx
git commit -m "feat: vendor orders page, route, and navigation"
```

---

# FEATURE 2 — PER-COLOUR PRODUCT VARIANTS

## Task 5: Database — `product_variants` + `variant_id` columns

**Files:**
- DB migration via MCP
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Apply the migration**

Call MCP `mcp__claude_ai_Supabase__apply_migration` with `project_id: "cergignhfwrkxgamzfwd"`, `name: "create_product_variants"`, and this `query`:

```sql
CREATE TABLE product_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  color_name text NOT NULL,
  image_url text,
  image_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access on product_variants"
  ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE purchases ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX ON purchases(variant_id);
CREATE INDEX ON sales(variant_id);
CREATE INDEX ON product_variants(product_id);
```

- [ ] **Step 2: Verify**

Call MCP `mcp__claude_ai_Supabase__list_tables` with `project_id: "cergignhfwrkxgamzfwd"`, `schemas: ["public"]`, `verbose: true`.
Expected: `public.product_variants` exists; `purchases` and `sales` each list a `variant_id` column.

- [ ] **Step 3: Mirror into `supabase/schema.sql`**

Append:

```sql

-- Migration: create_product_variants (2026-06-29)
CREATE TABLE product_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  color_name text NOT NULL,
  image_url text,
  image_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access on product_variants"
  ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE purchases ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
CREATE INDEX ON purchases(variant_id);
CREATE INDEX ON sales(variant_id);
CREATE INDEX ON product_variants(product_id);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): product_variants and variant_id on purchases/sales"
```

---

## Task 6: `AddProductModal` — colour checkbox + repeater

**Files:**
- Modify: `src/components/AddProductModal.jsx`

- [ ] **Step 1: Add colour state and helpers**

In `src/components/AddProductModal.jsx`, after the `mediaItems` state line (line 11) add:

```jsx
  const [hasColors, setHasColors] = useState(false)
  const [colors, setColors] = useState([]) // { id, name, qty, file, previewUrl }
```

After the existing `useState` declarations (before `handleSubmit`), add these helpers and a cleanup effect (add `useEffect` to the React import on line 1: `import { useEffect, useState } from 'react'`):

```jsx
  useEffect(() => () => {
    colors.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl) })
  }, [colors])

  function addColorRow() {
    setColors(prev => [...prev, { id: crypto.randomUUID(), name: '', qty: '', file: null, previewUrl: null }])
  }
  function updateColor(id, patch) {
    setColors(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  function setColorFile(id, file) {
    if (!file) return
    setColors(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.previewUrl) URL.revokeObjectURL(c.previewUrl)
      return { ...c, file, previewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeColorRow(id) {
    setColors(prev => {
      const row = prev.find(c => c.id === id)
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl)
      return prev.filter(c => c.id !== id)
    })
  }
```

- [ ] **Step 2: Replace `handleSubmit` with colour-aware logic**

Replace the entire `handleSubmit` function (lines 15-102) with:

```jsx
  async function handleSubmit(e) {
    e.preventDefault()
    const ppp = parseFloat(price)
    const sp = parseFloat(sellingPrice)
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (isNaN(sp) || sp <= 0) { setError('Enter a valid selling price'); return }

    let qty = 0
    if (hasColors) {
      if (colors.length === 0) { setError('Add at least one colour'); return }
      for (const c of colors) {
        if (!c.name.trim()) { setError('Each colour needs a name'); return }
        if (!c.file) { setError(`Add a photo for "${c.name || 'colour'}"`); return }
        if (isNaN(parseInt(c.qty)) || parseInt(c.qty) < 1) { setError('Each colour needs a valid quantity'); return }
      }
    } else {
      qty = parseInt(quantity)
      if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    }

    setLoading(true)
    setError('')

    // Upload general media
    const uploadedItems = []
    for (const item of mediaItems) {
      const ext = item.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, item.file)
      if (uploadError) {
        if (uploadedItems.length) await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        setError(uploadError.message); setLoading(false); return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      uploadedItems.push({ path, url: data.publicUrl, type: item.type })
    }

    // Upload colour photos
    const colorUploads = [] // { path, url, name, qty }
    if (hasColors) {
      for (const c of colors) {
        const ext = c.file.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, c.file)
        if (upErr) {
          const cleanup = [...uploadedItems.map(i => i.path), ...colorUploads.map(i => i.path)]
          if (cleanup.length) await supabase.storage.from('product-images').remove(cleanup)
          setError(upErr.message); setLoading(false); return
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        colorUploads.push({ path, url: data.publicUrl, name: c.name.trim(), qty: parseInt(c.qty) })
      }
    }

    const allUploadPaths = [...uploadedItems.map(i => i.path), ...colorUploads.map(i => i.path)]
    const image_url = uploadedItems[0]?.url ?? colorUploads[0]?.url ?? null

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        category_id: categoryId,
        selling_price: sp,
        ...(code.trim() && { code: code.trim() }),
        ...(image_url && { image_url }),
      })
      .select()
      .single()
    if (insertError) {
      if (allUploadPaths.length) await supabase.storage.from('product-images').remove(allUploadPaths)
      setError(insertError.message); setLoading(false); return
    }

    // Extra general media (index 1+) into product_images
    if (uploadedItems.length > 1) {
      const rows = uploadedItems.slice(1).map((item, i) => ({
        product_id: product.id, media_url: item.url, media_type: item.type, sort_order: i + 1,
      }))
      const { error: mediaError } = await supabase.from('product_images').insert(rows)
      if (mediaError) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(mediaError.message); setLoading(false); return
      }
    }

    const today = new Date().toISOString().slice(0, 10)

    if (hasColors) {
      // Insert variants, then one purchase per variant
      const variantRows = colorUploads.map(c => ({
        product_id: product.id, color_name: c.name, image_url: c.url, image_path: c.path,
      }))
      const { data: variants, error: varErr } = await supabase
        .from('product_variants').insert(variantRows).select('id, color_name')
      if (varErr) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(varErr.message); setLoading(false); return
      }
      const purchaseRows = variants.map((v, i) => ({
        product_id: product.id, date_of_purchase: today,
        quantity: colorUploads[i].qty, price_per_piece: ppp, variant_id: v.id,
      }))
      const { error: purErr } = await supabase.from('purchases').insert(purchaseRows)
      if (purErr) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(purErr.message); setLoading(false); return
      }
    } else {
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({ product_id: product.id, date_of_purchase: today, quantity: qty, price_per_piece: ppp })
      if (purchaseError) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(purchaseError.message); setLoading(false); return
      }
    }

    setLoading(false)
    onAdded()
    onClose()
  }
```

- [ ] **Step 3: Add the colour UI to the form**

Replace the single Quantity/Buy-Price block (lines 132-158, the `<div className="flex gap-3">…</div>` containing Quantity and Buy Price) with:

```jsx
          <div className="flex gap-3">
            {!hasColors && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  required={!hasColors}
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="e.g. 50"
                />
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price / Piece (₹)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 120"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={hasColors}
                onChange={e => { setHasColors(e.target.checked); if (e.target.checked && colors.length === 0) addColorRow() }} />
              Multiple colour options
            </label>
            {hasColors && (
              <div className="mt-3 space-y-3">
                {colors.map((c, idx) => (
                  <div key={c.id} className="border border-brand-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Colour {idx + 1}</span>
                      <button type="button" onClick={() => removeColorRow(c.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-green">
                        {c.previewUrl
                          ? <img src={c.previewUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] text-gray-400 text-center px-1">Add photo</span>}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { setColorFile(c.id, e.target.files[0]); e.target.value = '' }} />
                      </label>
                      <div className="flex-1 space-y-2">
                        <input type="text" value={c.name} onChange={e => updateColor(c.id, { name: e.target.value })}
                          className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          placeholder="Colour name (e.g. Rose Gold)" />
                        <input type="number" min="1" value={c.qty} onChange={e => updateColor(c.id, { qty: e.target.value })}
                          className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          placeholder="Quantity" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addColorRow}
                  className="w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
                  + Add colour
                </button>
              </div>
            )}
          </div>
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 5: Manual verification**

`npm run dev` → open a category → **+ Add Product**:
- Without colours: add as before → product created, stock correct.
- Tick **Multiple colour options** → Quantity field hides → add 2 colours with photos + quantities → save → product is created (verify in the DB via MCP `execute_sql`: `select * from product_variants order by created_at desc limit 5;` shows the two colours; `select * from purchases where variant_id is not null order by created_at desc limit 5;` shows two purchase rows).

- [ ] **Step 6: Commit**

```bash
git add src/components/AddProductModal.jsx
git commit -m "feat: colour options when adding a product"
```

---

## Task 7: `EditProductModal` — colours section

**Files:**
- Modify: `src/components/EditProductModal.jsx`

- [ ] **Step 1: Load existing variants**

In `src/components/EditProductModal.jsx`, after the `originalExtraItemsRef` line (line 17) add:

```jsx
  const [variants, setVariants] = useState([]) // existing: { id, color_name, image_url, image_path, salesCount, newName, newFile, newPreviewUrl }
  const [newColors, setNewColors] = useState([]) // { id, name, file, previewUrl }
  const [removedVariantIds, setRemovedVariantIds] = useState([])
```

Inside the existing `useEffect` `loadMedia()` (after `setMediaItems(items); setMediaLoading(false)` on lines 54-55), add a second loader. Replace the `loadMedia()` body's end so the effect also loads variants — add this block right before `setMediaLoading(false)`:

```jsx
      const { data: variantRows } = await supabase
        .from('product_variants')
        .select('id, color_name, image_url, image_path, sales(count)')
        .eq('product_id', product.id)
        .order('created_at')
      setVariants((variantRows ?? []).map(v => ({
        id: v.id,
        color_name: v.color_name,
        image_url: v.image_url,
        image_path: v.image_path,
        salesCount: v.sales?.[0]?.count ?? 0,
        newName: v.color_name,
        newFile: null,
        newPreviewUrl: null,
      })))
```

Add a cleanup effect after the existing `useEffect` (after line 58):

```jsx
  useEffect(() => () => {
    variants.forEach(v => { if (v.newPreviewUrl) URL.revokeObjectURL(v.newPreviewUrl) })
    newColors.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl) })
  }, [variants, newColors])
```

- [ ] **Step 2: Add variant edit helpers**

Add these functions before `handleSubmit` (before line 75):

```jsx
  function renameVariant(id, value) {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, newName: value } : v))
  }
  function replaceVariantPhoto(id, file) {
    if (!file) return
    setVariants(prev => prev.map(v => {
      if (v.id !== id) return v
      if (v.newPreviewUrl) URL.revokeObjectURL(v.newPreviewUrl)
      return { ...v, newFile: file, newPreviewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeExistingVariant(id) {
    setRemovedVariantIds(prev => [...prev, id])
    setVariants(prev => prev.filter(v => v.id !== id))
  }
  function addNewColorRow() {
    setNewColors(prev => [...prev, { id: crypto.randomUUID(), name: '', file: null, previewUrl: null }])
  }
  function updateNewColor(id, patch) {
    setNewColors(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  function setNewColorFile(id, file) {
    if (!file) return
    setNewColors(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.previewUrl) URL.revokeObjectURL(c.previewUrl)
      return { ...c, file, previewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeNewColorRow(id) {
    setNewColors(prev => {
      const row = prev.find(c => c.id === id)
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl)
      return prev.filter(c => c.id !== id)
    })
  }
```

- [ ] **Step 3: Persist variant changes in `handleSubmit`**

In `handleSubmit`, after the product `update` succeeds and before the `// All writes succeeded` comment (insert right before line 169's block, i.e. after the `if (updateError) { … }` block ends at line 167), add:

```jsx
    // Rename + replace photos on existing variants
    for (const v of variants) {
      const patch = {}
      if (v.newName.trim() && v.newName.trim() !== v.color_name) patch.color_name = v.newName.trim()
      if (v.newFile) {
        const ext = v.newFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, v.newFile)
        if (upErr) { setError(upErr.message); setLoading(false); return }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        patch.image_url = data.publicUrl
        patch.image_path = path
        if (v.image_path) await supabase.storage.from('product-images').remove([v.image_path])
      }
      if (Object.keys(patch).length) {
        await supabase.from('product_variants').update(patch).eq('id', v.id)
      }
    }

    // Add brand-new colours (no stock — added later via Add Stock)
    for (const c of newColors) {
      if (!c.name.trim() || !c.file) continue
      const ext = c.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, c.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      await supabase.from('product_variants').insert({
        product_id: product.id, color_name: c.name.trim(), image_url: data.publicUrl, image_path: path,
      })
    }

    // Delete removed variants (UI only allows those with no sales) + their photos.
    // The variant is already gone from `variants` state, so fetch its image_path from the DB.
    for (const removedId of removedVariantIds) {
      const { data: row } = await supabase.from('product_variants').select('image_path').eq('id', removedId).single()
      if (row?.image_path) await supabase.storage.from('product-images').remove([row.image_path])
      await supabase.from('product_variants').delete().eq('id', removedId)
    }
```

- [ ] **Step 4: Add the colours UI to the form**

In the JSX, after the `<MediaUploadSection … />` block (after line 230) and before `{error && …}`, add:

```jsx
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colours</label>
            {variants.length === 0 && newColors.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No colours on this product.</p>
            )}
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-2 border border-brand-border rounded-lg p-2">
                  <label className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-brand-border cursor-pointer hover:border-brand-green">
                    <img src={v.newPreviewUrl ?? v.image_url} alt="" className="w-full h-full object-cover" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => { replaceVariantPhoto(v.id, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <input type="text" value={v.newName} onChange={e => renameVariant(v.id, e.target.value)}
                    className="flex-1 border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  <button type="button" disabled={v.salesCount > 0} onClick={() => removeExistingVariant(v.id)}
                    title={v.salesCount > 0 ? 'Has sales — cannot remove' : 'Remove colour'}
                    className="text-xs text-red-400 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed">
                    Remove
                  </button>
                </div>
              ))}
              {newColors.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-2 border border-brand-border rounded-lg p-2 bg-brand-cream/40">
                  <label className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 border-dashed border-brand-border flex items-center justify-center cursor-pointer hover:border-brand-green">
                    {c.previewUrl ? <img src={c.previewUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">Photo</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { setNewColorFile(c.id, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <input type="text" value={c.name} onChange={e => updateNewColor(c.id, { name: e.target.value })}
                    placeholder={`New colour ${idx + 1}`}
                    className="flex-1 border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  <button type="button" onClick={() => removeNewColorRow(c.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addNewColorRow}
              className="mt-2 w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
              + Add colour
            </button>
            <p className="text-[11px] text-gray-400 mt-1">New colours start with 0 stock — add stock from the product page.</p>
          </div>
```

- [ ] **Step 5: Lint + build + manual check**

Run: `npm run lint` → no errors. Run: `npm run build` → succeeds.
`npm run dev`: edit a colour product → rename a colour, replace a colour photo, add a new colour, and confirm a colour with sales cannot be removed. Save → reopen edit → changes persisted.

- [ ] **Step 6: Commit**

```bash
git add src/components/EditProductModal.jsx
git commit -m "feat: manage colours when editing a product"
```

---

## Task 8: `ProductDetail` per-colour stock + colour selectors in stock/sale modals

**Files:**
- Modify: `src/components/AddPurchaseModal.jsx`
- Modify: `src/components/AddSaleModal.jsx`
- Modify: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Add colour selector to `AddPurchaseModal`**

In `src/components/AddPurchaseModal.jsx`, change the signature (line 4) to accept variants:

```jsx
export default function AddPurchaseModal({ productId, variants = [], onClose, onAdded }) {
```

Add state after line 9 (`const [error, setError] = useState('')`):

```jsx
  const [variantId, setVariantId] = useState('')
```

In `handleSubmit`, after the date validation (line 17) add:

```jsx
    if (variants.length > 0 && !variantId) { setError('Select a colour'); return }
```

Change the insert object (lines 20-25) to include `variant_id`:

```jsx
    const { error: err } = await supabase.from('purchases').insert({
      product_id: productId,
      date_of_purchase: date,
      quantity: qty,
      price_per_piece: ppp,
      ...(variants.length > 0 && { variant_id: variantId }),
    })
```

Add the selector to the form — insert right after the Date `<div>` block (after line 46) :

```jsx
          {variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
              <select required value={variantId} onChange={e => setVariantId(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                <option value="">Select a colour…</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.color_name}</option>)}
              </select>
            </div>
          )}
```

- [ ] **Step 2: Add colour selector to `AddSaleModal`**

In `src/components/AddSaleModal.jsx`, change the signature (line 4):

```jsx
export default function AddSaleModal({ productId, defaultSellingPrice, variants = [], onClose, onAdded }) {
```

Add state after line 8 (`const [error, setError] = useState('')`):

```jsx
  const [variantId, setVariantId] = useState('')
```

In `handleSubmit`, after `setLoading(true)` (line 14) add:

```jsx
    if (variants.length > 0 && !variantId) { setError('Select a colour'); setLoading(false); return }
```

Change the insert (lines 15-21) to include `variant_id`:

```jsx
    const { error } = await supabase.from('sales').insert({
      product_id: productId,
      sale_date: form.sale_date,
      quantity_sold: parseInt(form.quantity_sold),
      selling_price: parseFloat(form.selling_price),
      payment_received: paymentReceived,
      ...(variants.length > 0 && { variant_id: variantId }),
    })
```

Add the selector after the Sale Date `<div>` (after line 37):

```jsx
          {variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
              <select required value={variantId} onChange={e => setVariantId(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                <option value="">Select a colour…</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.color_name} — {v.stock} in stock</option>)}
              </select>
            </div>
          )}
```

- [ ] **Step 3: Load variants + per-colour stock in `ProductDetail`**

In `src/pages/ProductDetail.jsx`, add state after `productImages` (line 23):

```jsx
  const [variants, setVariants] = useState([]) // { id, color_name, image_url, stock }
```

In `fetchData`, add a sixth query to the `Promise.all` (extend the destructure on line 35 to include `{ data: vars }` and add the query):

```jsx
    const [{ data: prod }, { data: purch }, { data: sale }, { data: rev }, { data: imgs }, { data: vars }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('purchases').select('*').eq('product_id', id).order('date_of_purchase', { ascending: false }),
      supabase.from('sales').select('*').eq('product_id', id).order('sale_date', { ascending: false }),
      supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }),
      supabase.from('product_images').select('media_url, media_type, sort_order').eq('product_id', id).order('sort_order'),
      supabase.from('product_variants').select('id, color_name, image_url, purchases(quantity), sales(quantity_sold)').eq('product_id', id).order('created_at'),
    ])
```

After `setProductImages(imgs ?? [])` (line 46) add:

```jsx
    setVariants((vars ?? []).map(v => ({
      id: v.id,
      color_name: v.color_name,
      image_url: v.image_url,
      stock: (v.purchases ?? []).reduce((s, p) => s + p.quantity, 0) - (v.sales ?? []).reduce((s, x) => s + x.quantity_sold, 0),
    })))
```

- [ ] **Step 4: Render the per-colour stock breakdown**

In `ProductDetail`, insert a colour breakdown block right after the stat-cards grid (after the grid `</div>` on line 111):

```jsx
        {variants.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-brand-green mb-3">Stock by Colour</h2>
            <div className="flex flex-wrap gap-3">
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-white rounded-lg border border-brand-border px-3 py-2">
                  {v.image_url && <img src={v.image_url} alt={v.color_name} className="w-9 h-9 rounded object-cover" />}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.color_name}</p>
                    <p className={`text-xs ${v.stock <= 0 ? 'text-red-500' : 'text-brand-green'}`}>{v.stock} in stock</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 5: Pass `variants` to the stock/sale modals**

Change the modal render lines (217 and 219) to pass `variants`:

```jsx
      {showPurchase && <AddPurchaseModal productId={id} variants={variants} onClose={() => setShowPurchase(false)} onAdded={fetchData} />}
```

```jsx
      {showSale && <AddSaleModal productId={id} defaultSellingPrice={product.selling_price} variants={variants} onClose={() => setShowSale(false)} onAdded={fetchData} />}
```

- [ ] **Step 6: Lint + build + manual check**

Run: `npm run lint` → no errors. Run: `npm run build` → succeeds.
`npm run dev`: open a colour product's detail page → "Stock by Colour" shows each colour's stock. **+ Add Stock** with a colour → that colour's stock rises. **+ Add Sale** with a colour → that colour's stock drops. Total **Stock** card = sum of colours (plus any uncoloured stock).

- [ ] **Step 7: Commit**

```bash
git add src/components/AddPurchaseModal.jsx src/components/AddSaleModal.jsx src/pages/ProductDetail.jsx
git commit -m "feat: per-colour stock on product detail and stock/sale modals"
```

---

## Task 9: Cart — colour-aware line identity

**Files:**
- Modify: `src/contexts/CartContext.jsx`
- Modify: `src/components/customer/CartDrawer.jsx`
- Modify: `src/components/customer/CheckoutModal.jsx`

- [ ] **Step 1: Add `cartLineKey` and colour-aware mutations**

In `src/contexts/CartContext.jsx`, add an exported helper after `const STORAGE_KEY = 'levaro_cart'` (line 5):

```jsx
export function cartLineKey(item) {
  return `${item.id}::${item.color ?? ''}`
}
```

Replace `addItem` (lines 39-55) with:

```jsx
  // product: { id, name, code, price, image, color?, variantId? }
  const addItem = (product) => {
    const key = `${product.id}::${product.color ?? ''}`
    setItems(prev => {
      const existing = prev.find(i => cartLineKey(i) === key)
      if (existing) {
        return prev.map(i => cartLineKey(i) === key ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        code: product.code ?? null,
        price: Number(product.price),
        image: product.image ?? null,
        color: product.color ?? null,
        variantId: product.variantId ?? null,
        qty: 1,
      }]
    })
    showToast('Added to cart')
  }
```

Replace `removeItem` and `setQty` (lines 57-66) with key-based versions:

```jsx
  const removeItem = (key) => setItems(prev => prev.filter(i => cartLineKey(i) !== key))

  const setQty = (key, qty) => {
    const n = Math.max(0, Math.floor(qty))
    setItems(prev =>
      n === 0
        ? prev.filter(i => cartLineKey(i) !== key)
        : prev.map(i => cartLineKey(i) === key ? { ...i, qty: n } : i)
    )
  }
```

(`has(id)` stays as-is — it still answers "is this product in the cart in any colour".)

- [ ] **Step 2: Use the line key in `CartDrawer`**

In `src/components/customer/CartDrawer.jsx`, import the helper (line 2 area):

```jsx
import { useCart, cartLineKey } from '../../contexts/CartContext'
```

Replace the `<li>` opening (line 60) with a keyed version and show the colour. Replace lines 60-71 with:

```jsx
              {items.map(item => {
                const key = cartLineKey(item)
                return (
                <li key={key} className="flex gap-3">
                  <div className="w-16 h-20 flex-shrink-0 rounded-md overflow-hidden bg-brand-green/10">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center levaro-display text-brand-green/30" style={{ fontSize: '1.5rem' }}>{item.name.charAt(0).toUpperCase()}</div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="levaro-display text-gray-800 truncate" style={{ fontSize: '1rem', fontWeight: 500 }}>{item.name}</p>
                    {item.color && (
                      <p className="truncate" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.66rem', color: '#1a5c45', fontWeight: 600 }}>{item.color}</p>
                    )}
                    {item.code && (
                      <p className="truncate" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.66rem', color: '#9ca3af' }}>{item.code}</p>
                    )}
```

Update the three handlers that used `item.id` to use `key`: `setQty(item.id, item.qty - 1)` → `setQty(key, item.qty - 1)`, `setQty(item.id, item.qty + 1)` → `setQty(key, item.qty + 1)`, `removeItem(item.id)` → `removeItem(key)` (lines 80, 87, 94).

Close the new arrow function: change the `</li>` end of the map (line 102) to:

```jsx
                </li>
                )
              })}
```

- [ ] **Step 3: Colour in the WhatsApp message**

In `src/components/customer/CheckoutModal.jsx`, replace the `orderLines` map (lines 6-9) with:

```jsx
  const orderLines = items.map((i, idx) => {
    const codePart = i.code ? ` (${i.code})` : ''
    const colorPart = i.color ? ` — ${i.color}` : ''
    return `${idx + 1}. ${i.name}${codePart}${colorPart} — Qty: ${i.qty} — ₹${(i.price * i.qty).toFixed(0)}`
  })
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint` → no errors. Run: `npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/CartContext.jsx src/components/customer/CartDrawer.jsx src/components/customer/CheckoutModal.jsx
git commit -m "feat: colour-aware cart line identity and checkout message"
```

---

## Task 10: Customer storefront — colour selection

**Files:**
- Modify: `src/pages/CustomerCategory.jsx`
- Modify: `src/components/customer/ProductMediaModal.jsx`

- [ ] **Step 1: Fetch variants and compute per-colour stock in `CustomerCategory`**

In `src/pages/CustomerCategory.jsx`, extend the products `.select(...)` (line 43) to include variants:

```jsx
            .select('id, name, code, image_url, selling_price, purchases(quantity), sales(quantity_sold), product_reviews(rating), product_images(media_url, media_type, sort_order), product_variants(id, color_name, image_url, purchases(quantity), sales(quantity_sold))')
```

Inside the `products.map`, after `const allMedia = buildMedia(product)` (line 122) add:

```jsx
              const variants = (product.product_variants ?? []).map(v => ({
                id: v.id,
                color_name: v.color_name,
                image_url: v.image_url,
                stock: (v.purchases ?? []).reduce((s, p) => s + p.quantity, 0) - (v.sales ?? []).reduce((s, x) => s + x.quantity_sold, 0),
              }))
              const hasVariants = variants.length > 0
```

- [ ] **Step 2: Route variant products through the modal to pick a colour**

Replace the card "ADD TO CART" `<button>` (lines 201-212) with:

```jsx
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={e => {
                        e.stopPropagation()
                        if (hasVariants) {
                          setViewingProduct({ product, allMedia, soldOut, variants })
                          return
                        }
                        addItem({ id: product.id, name: product.name, code: product.code, price: product.selling_price, image: cartImage })
                      }}
                      className="mt-2.5 w-full rounded-md py-2 bg-brand-green text-brand-gold hover:opacity-90 transition-opacity font-semibold disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.66rem', letterSpacing: '0.1em' }}
                    >
                      {soldOut ? 'SOLD OUT' : product.selling_price == null ? 'PRICE ON REQUEST' : hasVariants ? 'CHOOSE COLOUR' : 'ADD TO CART'}
                    </button>
```

Update the card's own `onClick` (line 130) so the modal always receives variants:

```jsx
                  onClick={() => setViewingProduct({ product, allMedia, soldOut, variants })}
```

- [ ] **Step 3: Pass variants into `ProductMediaModal`**

Replace the `ProductMediaModal` render (lines 233-241) with:

```jsx
      {viewingProduct && (
        <ProductMediaModal
          product={viewingProduct.product}
          allMedia={viewingProduct.allMedia}
          soldOut={viewingProduct.soldOut}
          variants={viewingProduct.variants ?? []}
          onClose={() => setViewingProduct(null)}
          onReview={p => { setViewingProduct(null); setReviewingProduct({ id: p.id, name: p.name }) }}
        />
      )}
```

- [ ] **Step 4: Colour selector in `ProductMediaModal`**

In `src/components/customer/ProductMediaModal.jsx`, change the signature (line 13):

```jsx
export default function ProductMediaModal({ product, allMedia = [], soldOut, variants = [], onClose, onReview }) {
```

Replace the body up to `handleAdd` (lines 14-22) with:

```jsx
  const [zoomOpen, setZoomOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const { addItem } = useCart()
  const hasVariants = variants.length > 0
  const displayMedia = selectedVariant?.image_url
    ? [{ url: selectedVariant.image_url, type: 'image' }]
    : allMedia
  const canAdd = product.selling_price != null && (
    hasVariants ? (selectedVariant && selectedVariant.stock > 0) : !soldOut
  )
  const cartImage = selectedVariant?.image_url ?? allMedia[0]?.url ?? product.image_url ?? null

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      code: product.code,
      price: product.selling_price,
      image: cartImage,
      ...(selectedVariant && { color: selectedVariant.color_name, variantId: selectedVariant.id }),
    })
    onClose()
  }
```

Replace every use of `allMedia` in the media `<div>` (lines 38-74) with `displayMedia` (the `onDoubleClick`, the `allMedia.length > 0 ?` checks, `<MediaSlider items={allMedia}>`, and the zoom-button condition all become `displayMedia`).

Add the colour selector after the price `<p>` block and before the `{soldOut && …}` block (after line 106). Insert:

```jsx
            {hasVariants && (
              <div className="mt-3">
                <p className="uppercase text-gray-500 mb-1.5" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.6rem', letterSpacing: '0.18em' }}>
                  Colour {selectedVariant ? `· ${selectedVariant.color_name}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => {
                    const out = v.stock <= 0
                    const active = selectedVariant?.id === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={out}
                        onClick={() => setSelectedVariant(v)}
                        title={out ? `${v.color_name} — sold out` : v.color_name}
                        className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${active ? 'border-brand-green' : 'border-transparent'} ${out ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-green/50'}`}
                      >
                        {v.image_url
                          ? <img src={v.image_url} alt={v.color_name} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-[9px] text-gray-500">{v.color_name}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
```

Update the Add-to-cart button label/disabled logic (lines 117-125). Replace the button text expression with one that asks for a colour first:

```jsx
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="mt-4 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.78rem', letterSpacing: '0.12em' }}
            >
              {soldOut ? 'SOLD OUT'
                : product.selling_price == null ? 'PRICE ON REQUEST'
                : hasVariants && !selectedVariant ? 'SELECT A COLOUR'
                : 'ADD TO CART'}
            </button>
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint` → no errors. Run: `npm run build` → succeeds.

- [ ] **Step 6: Manual verification (the key end-to-end check)**

`npm run dev` → `/shop` → open the colour product's category:
- Card shows **CHOOSE COLOUR**; clicking opens the modal.
- Modal shows colour thumbnails; selecting one swaps the main image; a 0-stock colour is disabled.
- **ADD TO CART** is disabled until a colour is picked.
- Add two different colours of the same product → cart shows **two separate lines**, each with the colour label.
- Checkout → the WhatsApp message lists each line with its colour, e.g. `1. Ring — Rose Gold — Qty: 1 — ₹...`.
- A product **without** colours still adds directly from the card as before.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CustomerCategory.jsx src/components/customer/ProductMediaModal.jsx
git commit -m "feat: customer colour selection on storefront"
```

---

## Task 11: Docs + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the schema notes in `CLAUDE.md`**

Add to the schema list in `CLAUDE.md` (under "Supabase schema"):

```markdown
- `vendor_orders` — `id, vendor_name, phone, order_price, quantity, location, bill_url, bill_path, created_by, created_at` (standalone vendor order log; bills in the `order-bills` bucket)
- `product_variants` — `id, product_id, color_name, image_url, image_path, created_at` (per-colour options)
- `purchases` / `sales` also have a nullable `variant_id` → `product_variants` (per-colour stock = Σ purchases − Σ sales for that variant)
```

- [ ] **Step 2: Full build + lint**

Run: `npm run lint` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note vendor_orders and product_variants in CLAUDE.md"
```

- [ ] **Step 4: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide how to integrate `feature/orders-and-colour-variants`.

---

## Self-Review Notes (addressed)

- **Spec coverage:** Orders table/bucket (T1), Orders CRUD modals (T2–T3), Orders page + nav (T4); variants table + `variant_id` (T5), Add-product colours (T6), Edit-product colours (T7), per-colour stock + admin selectors (T8), cart (T9), storefront selection (T10), docs (T11). All spec sections map to a task.
- **Legacy stock** ("keep as no-colour stock"): total stock is computed from product-level `purchases`/`sales` aggregation (which already includes both variant and variant-less rows), so converting a product to multi-colour preserves its old stock with no migration — confirmed in T8/T10 (product-level `stockLeft` unchanged).
- **Type/name consistency:** `cartLineKey` defined in T9 and used in `CartDrawer` (T9); `variants` prop shape `{ id, color_name, image_url, stock }` is consistent across `ProductDetail` (T8), `AddPurchaseModal`/`AddSaleModal` (T8), `CustomerCategory` (T10), `ProductMediaModal` (T10).
- **Placeholder scan:** no TBD/TODO; every code step contains complete code.
