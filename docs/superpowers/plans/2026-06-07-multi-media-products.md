# Multi-Media Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add up to 10 images/videos per product; customer cards become swipeable sliders and tapping opens a full-screen media lightbox — without altering any existing data.

**Architecture:** A new `product_images` Supabase table stores extra media additively. The existing `products.image_url` is always displayed first in every slider, never modified. Three new components (`MediaSlider`, `MediaUploadSection`, `ProductMediaModal`) are built independently before touching any existing file.

**Tech Stack:** React 19, Supabase JS v2, Tailwind CSS v3, no new npm packages.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/MediaSlider.jsx` | **Create** | Touch-swipeable slider for images/videos |
| `src/components/MediaUploadSection.jsx` | **Create** | Multi-file upload widget for admin modals |
| `src/components/customer/ProductMediaModal.jsx` | **Create** | Full-screen customer lightbox |
| `src/components/AddProductModal.jsx` | **Modify** | Replace single-photo section with MediaUploadSection |
| `src/components/EditProductModal.jsx` | **Modify** | Replace single-photo section with MediaUploadSection + load existing media |
| `src/pages/CustomerCategory.jsx` | **Modify** | Add slider to cards, open lightbox on tap |

---

## Task 1: Create product_images table in Supabase

**Files:**
- No local files — Supabase SQL migration

- [ ] **Step 1: Run migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__execute_sql` (or paste into the Supabase SQL editor) with this SQL:

```sql
create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  media_url   text not null,
  media_type  text not null check (media_type in ('image', 'video')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.product_images enable row level security;

create policy "Public read product_images"
  on public.product_images for select
  using (true);

create policy "Authenticated insert product_images"
  on public.product_images for insert
  to authenticated
  with check (true);

create policy "Authenticated delete product_images"
  on public.product_images for delete
  to authenticated
  using (true);
```

- [ ] **Step 2: Verify table exists**

Run:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'product_images';
```
Expected: rows for `id`, `product_id`, `media_url`, `media_type`, `sort_order`, `created_at`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add product_images table migration"
```

---

## Task 2: Build MediaSlider component

**Files:**
- Create: `src/components/MediaSlider.jsx`

- [ ] **Step 1: Create the file**

`src/components/MediaSlider.jsx`:
```jsx
import { useState, useRef } from 'react'

export default function MediaSlider({ items, className = '' }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)

  if (!items || items.length === 0) return null

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -40 && index < items.length - 1) setIndex(i => i + 1)
    else if (dx > 40 && index > 0) setIndex(i => i - 1)
  }

  return (
    <div
      className={`relative overflow-hidden w-full h-full ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="shrink-0 w-full h-full">
            {item.type === 'video' ? (
              <video
                src={item.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); setIndex(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all pointer-events-auto ${
                i === index ? 'bg-white scale-110' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and manually verify**

Run: `npm run dev` and navigate to any page that has a product card.

The component is not wired up yet — this step just ensures the dev server starts without errors.

Expected: No compile errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MediaSlider.jsx
git commit -m "feat: add MediaSlider component"
```

---

## Task 3: Build MediaUploadSection component

**Files:**
- Create: `src/components/MediaUploadSection.jsx`

**Item shape used throughout the codebase:**
```
{
  file?: File,           // present for new (not-yet-uploaded) files
  previewUrl?: string,   // object URL for new files; same as url for existing
  url?: string,          // public Supabase URL (for existing items)
  type: 'image'|'video',
  isExisting: boolean,
  removable: boolean,    // false only for products.image_url entry
  id?: string,           // product_images row UUID (existing removable items only)
}
```

- [ ] **Step 1: Create the file**

`src/components/MediaUploadSection.jsx`:
```jsx
import { useRef } from 'react'

export default function MediaUploadSection({ items, onChange, maxItems = 10 }) {
  const fileInputRef = useRef(null)

  function handleFiles(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length) return
    const remaining = maxItems - items.length
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      isExisting: false,
      removable: true,
    }))
    onChange([...items, ...toAdd])
  }

  function removeItem(idx) {
    const item = items[idx]
    if (!item.isExisting && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Photos / Videos{' '}
        <span className="text-gray-400 font-normal">(optional, max {maxItems})</span>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-border"
            >
              {item.type === 'video' ? (
                <video
                  src={item.previewUrl ?? item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={item.previewUrl ?? item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {item.removable && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-500 leading-none"
                >
                  ✕
                </button>
              )}
              {item.type === 'video' && (
                <div className="absolute bottom-0.5 left-0.5 bg-black/60 rounded px-1 text-white text-[9px]">
                  ▶
                </div>
              )}
              {!item.removable && (
                <div className="absolute bottom-0.5 left-0.5 bg-black/40 rounded px-1 text-white text-[9px]">
                  main
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {items.length < maxItems && (
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
        >
          📷 Add photo / video{items.length > 0 ? ` (${items.length}/${maxItems})` : ''}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manually verify no compile errors**

Check dev server terminal — no red errors expected.

- [ ] **Step 3: Commit**

```bash
git add src/components/MediaUploadSection.jsx
git commit -m "feat: add MediaUploadSection component"
```

---

## Task 4: Update AddProductModal

**Files:**
- Modify: `src/components/AddProductModal.jsx`

Replaces the single-image section. New logic: upload all picked files, first file's URL → `products.image_url`, remaining → `product_images` rows.

- [ ] **Step 1: Rewrite AddProductModal.jsx**

`src/components/AddProductModal.jsx`:
```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import MediaUploadSection from './MediaUploadSection'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = parseInt(quantity)
    const ppp = parseFloat(price)
    const sp = parseFloat(sellingPrice)
    if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (isNaN(sp) || sp <= 0) { setError('Enter a valid selling price'); return }

    setLoading(true)
    setError('')

    // Upload all selected media files
    const uploadedItems = []
    for (const item of mediaItems) {
      const ext = item.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, item.file)
      if (uploadError) {
        if (uploadedItems.length) {
          await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        }
        setError(uploadError.message)
        setLoading(false)
        return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      uploadedItems.push({ path, url: data.publicUrl, type: item.type })
    }

    const image_url = uploadedItems[0]?.url ?? null

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
      if (uploadedItems.length) {
        await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
      }
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Insert extra media (index 1+) into product_images
    if (uploadedItems.length > 1) {
      const rows = uploadedItems.slice(1).map((item, i) => ({
        product_id: product.id,
        media_url: item.url,
        media_type: item.type,
        sort_order: i,
      }))
      const { error: mediaError } = await supabase.from('product_images').insert(rows)
      if (mediaError) { setError(mediaError.message); setLoading(false); return }
    }

    const today = new Date().toISOString().slice(0, 10)
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({ product_id: product.id, date_of_purchase: today, quantity: qty, price_per_piece: ppp })
    setLoading(false)
    if (purchaseError) { setError(purchaseError.message); return }

    mediaItems.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. Gold Earrings"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. GE-001"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 50"
              />
            </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price / Piece (₹)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250"
            />
          </div>
          <MediaUploadSection items={mediaItems} onChange={setMediaItems} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manually verify**

In dev server, open any category's admin Products page, click **+ Add Product**, and verify:
- The old single "📷 Add photo" button is replaced by the new "📷 Add photo / video" button
- Picking multiple files shows thumbnails with ✕ buttons
- Submitting with no media works (product created with no image)
- Submitting with 1 file: product created, `products.image_url` is set, no rows in `product_images`
- Submitting with 2+ files: product created, first file in `products.image_url`, rest in `product_images`

Check Supabase Table Editor to confirm rows.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddProductModal.jsx
git commit -m "feat: multi-media support in AddProductModal"
```

---

## Task 5: Update EditProductModal

**Files:**
- Modify: `src/components/EditProductModal.jsx`

Loads existing media on mount (image_url as non-removable first item, product_images rows as removable). Tracks removed IDs. On submit: deletes removed rows/storage objects, uploads new files, inserts into product_images.

- [ ] **Step 1: Rewrite EditProductModal.jsx**

`src/components/EditProductModal.jsx`:
```jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import MediaUploadSection from './MediaUploadSection'

export default function EditProductModal({ product, onClose, onUpdated }) {
  const [name, setName] = useState(product.name)
  const [code, setCode] = useState(product.code ?? '')
  const [sellingPrice, setSellingPrice] = useState(
    product.selling_price != null ? String(product.selling_price) : ''
  )
  const [mediaItems, setMediaItems] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const originalExtraItemsRef = useRef([])

  useEffect(() => {
    async function loadMedia() {
      const { data } = await supabase
        .from('product_images')
        .select('id, media_url, media_type, sort_order')
        .eq('product_id', product.id)
        .order('sort_order')

      const rows = data ?? []
      originalExtraItemsRef.current = rows.map(row => ({
        id: row.id,
        storagePath: row.media_url.split('/product-images/')[1] ?? null,
      }))

      const items = []
      if (product.image_url) {
        items.push({
          url: product.image_url,
          previewUrl: product.image_url,
          type: 'image',
          isExisting: true,
          removable: false,
        })
      }
      rows.forEach(row => {
        items.push({
          id: row.id,
          url: row.media_url,
          previewUrl: row.media_url,
          type: row.media_type,
          isExisting: true,
          removable: true,
        })
      })
      setMediaItems(items)
      setMediaLoading(false)
    }
    loadMedia()
  }, [product.id, product.image_url])

  function handleMediaChange(newItems) {
    const removedFromCurrent = mediaItems.filter(
      old => old.isExisting && old.removable && !newItems.some(n => n.id === old.id)
    )
    if (removedFromCurrent.length) {
      setRemovedIds(prev => [...prev, ...removedFromCurrent.map(r => r.id)])
    }
    setMediaItems(newItems)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Delete removed product_images rows and their storage objects
    for (const removedId of removedIds) {
      const orig = originalExtraItemsRef.current.find(i => i.id === removedId)
      if (orig?.storagePath) {
        await supabase.storage.from('product-images').remove([orig.storagePath])
      }
      await supabase.from('product_images').delete().eq('id', removedId)
    }

    // Upload new files
    const newItems = mediaItems.filter(item => !item.isExisting)
    const uploadedItems = []
    for (const item of newItems) {
      const ext = item.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, item.file)
      if (uploadError) {
        if (uploadedItems.length) {
          await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        }
        setError(uploadError.message)
        setLoading(false)
        return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      uploadedItems.push({ path, url: data.publicUrl, type: item.type })
    }

    // If product had no image_url, first new upload becomes image_url
    let newImageUrl = product.image_url
    let extraStartIdx = 0
    if (!newImageUrl && uploadedItems.length > 0) {
      newImageUrl = uploadedItems[0].url
      extraStartIdx = 1
    }

    // Insert extra uploaded items into product_images
    const existingExtraCount = mediaItems.filter(i => i.isExisting && i.removable).length
    const extraRows = uploadedItems.slice(extraStartIdx).map((item, i) => ({
      product_id: product.id,
      media_url: item.url,
      media_type: item.type,
      sort_order: existingExtraCount + i,
    }))
    if (extraRows.length) {
      const { error: mediaError } = await supabase.from('product_images').insert(extraRows)
      if (mediaError) {
        await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        setError(mediaError.message)
        setLoading(false)
        return
      }
    }

    // Update product row
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        code: code.trim() || null,
        selling_price: parseFloat(sellingPrice) || null,
        image_url: newImageUrl,
      })
      .eq('id', product.id)
    setLoading(false)
    if (updateError) { setError(updateError.message); return }

    newItems.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. GE-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selling Price / Piece (₹){' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250"
            />
          </div>
          {mediaLoading ? (
            <p className="text-sm text-gray-400">Loading media...</p>
          ) : (
            <MediaUploadSection items={mediaItems} onChange={handleMediaChange} />
          )}
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

- [ ] **Step 2: Manually verify**

In dev server, open a product's Edit modal and verify:
- Existing `image_url` shows as first thumbnail with "main" label and no ✕ button
- Any existing `product_images` rows show as thumbnails with ✕ buttons
- Adding new files and saving: new rows appear in `product_images` in Supabase
- Removing an existing extra image and saving: the row is deleted from `product_images`, storage object removed
- Products with no image_url start empty; first new upload sets image_url on save

- [ ] **Step 3: Commit**

```bash
git add src/components/EditProductModal.jsx
git commit -m "feat: multi-media support in EditProductModal"
```

---

## Task 6: Build ProductMediaModal

**Files:**
- Create: `src/components/customer/ProductMediaModal.jsx`

Full-screen customer lightbox. Clicking the backdrop closes it. The content panel stops propagation.

- [ ] **Step 1: Create the file**

`src/components/customer/ProductMediaModal.jsx`:
```jsx
import MediaSlider from '../MediaSlider'

export default function ProductMediaModal({ product, allMedia, soldOut, onClose, onReview }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex flex-col"
      onClick={onClose}
    >
      <div
        className="relative w-full"
        style={{ height: '60vh' }}
        onClick={e => e.stopPropagation()}
      >
        {allMedia.length > 0 ? (
          <MediaSlider items={allMedia} />
        ) : (
          <div className="w-full h-full bg-brand-green/20 flex items-center justify-center">
            <span className="text-7xl font-bold text-brand-green/30">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-base hover:bg-black/70"
        >
          ✕
        </button>
      </div>

      <div
        className="bg-white p-5 rounded-t-2xl mt-auto"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-gray-900 text-lg leading-tight">{product.name}</p>
        <p className="text-brand-green font-bold text-xl mt-1">
          {product.selling_price != null
            ? `₹${Number(product.selling_price).toFixed(0)}`
            : <span className="text-gray-400 font-normal text-base">Price on request</span>
          }
        </p>
        {soldOut && (
          <p className="text-red-500 text-sm font-semibold mt-1">Sold Out</p>
        )}
        <button
          type="button"
          onClick={() => onReview(product)}
          className="mt-4 w-full border border-brand-green text-brand-green rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-green/5 transition-colors"
        >
          ★ Write a Review
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no compile errors**

Check dev server terminal — no errors expected (component not yet used).

- [ ] **Step 3: Commit**

```bash
git add src/components/customer/ProductMediaModal.jsx
git commit -m "feat: add ProductMediaModal customer lightbox"
```

---

## Task 7: Update CustomerCategory page

**Files:**
- Modify: `src/pages/CustomerCategory.jsx`

Adds `product_images` to the query, replaces the image area with `MediaSlider`, opens `ProductMediaModal` on card tap.

- [ ] **Step 1: Rewrite CustomerCategory.jsx**

`src/pages/CustomerCategory.jsx`:
```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
import FloatingSuggestionButton from '../components/customer/FloatingSuggestionButton'
import ReviewModal from '../components/customer/ReviewModal'
import MediaSlider from '../components/MediaSlider'
import ProductMediaModal from '../components/customer/ProductMediaModal'

function buildMedia(product) {
  const items = []
  if (product.image_url) items.push({ url: product.image_url, type: 'image' })
  ;(product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach(img => items.push({ url: img.media_url, type: img.media_type }))
  return items
}

export default function CustomerCategory() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewingProduct, setReviewingProduct] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: cat }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('name').eq('id', categoryId).single(),
        supabase
          .from('products')
          .select('id, name, image_url, selling_price, purchases(quantity), sales(quantity_sold), product_reviews(rating), product_images(media_url, media_type, sort_order)')
          .eq('category_id', categoryId)
          .order('created_at', { ascending: false }),
      ])
      setCategory(cat)
      setProducts(prods ?? [])
      setLoading(false)
    }
    load()
  }, [categoryId])

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <div className="bg-brand-green px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/shop')}
            className="text-brand-gold/70 hover:text-brand-gold text-sm transition-colors"
          >
            ← Collections
          </button>
          <span className="font-bold text-brand-gold tracking-[0.3em] text-sm">LEVARO</span>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-6">
          {category?.name ?? ''}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-20">No products in this collection yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {products.map(product => {
              const totalQty = (product.purchases ?? []).reduce((sum, p) => sum + p.quantity, 0)
              const soldQty = (product.sales ?? []).reduce((sum, s) => sum + s.quantity_sold, 0)
              const soldOut = totalQty - soldQty <= 0
              const reviewRatings = product.product_reviews ?? []
              const reviewCount = reviewRatings.length
              const avgRating = reviewCount > 0
                ? (reviewRatings.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1)
                : null
              const allMedia = buildMedia(product)

              return (
                <div
                  key={product.id}
                  onClick={() => !soldOut && setViewingProduct({ product, allMedia, soldOut })}
                  className={`rounded-2xl overflow-hidden bg-white border shadow-sm transition-all ${
                    soldOut
                      ? 'border-brand-border opacity-60 cursor-not-allowed'
                      : 'border-brand-border hover:border-brand-green hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="relative aspect-square">
                    {allMedia.length > 0 ? (
                      <MediaSlider items={allMedia} />
                    ) : (
                      <div className="w-full h-full bg-brand-green/10 flex items-center justify-center">
                        <span className="text-5xl font-bold text-brand-green/20">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <span className="bg-black/65 text-white text-[11px] font-bold tracking-[0.3em] px-4 py-2 rounded-full uppercase">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                    <p className="text-brand-green font-bold text-base mt-1">
                      {product.selling_price != null
                        ? `₹${Number(product.selling_price).toFixed(0)}`
                        : <span className="text-gray-400 font-normal text-sm">Price on request</span>
                      }
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {avgRating ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="text-brand-gold">★</span>
                          <span className="font-semibold text-gray-700">{avgRating}</span>
                          <span className="text-gray-400">({reviewCount})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No reviews yet</span>
                      )}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setReviewingProduct({ id: product.id, name: product.name }) }}
                        className="border border-brand-green text-brand-green rounded-lg px-2 py-1 text-xs font-semibold hover:bg-brand-green/5 transition-colors whitespace-nowrap"
                      >
                        ★ Review
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CustomerFooter />
      <FloatingFeedbackButton />
      <FloatingSuggestionButton />

      {reviewingProduct && (
        <ReviewModal
          productId={reviewingProduct.id}
          productName={reviewingProduct.name}
          onClose={() => setReviewingProduct(null)}
        />
      )}
      {viewingProduct && (
        <ProductMediaModal
          product={viewingProduct.product}
          allMedia={viewingProduct.allMedia}
          soldOut={viewingProduct.soldOut}
          onClose={() => setViewingProduct(null)}
          onReview={p => { setViewingProduct(null); setReviewingProduct({ id: p.id, name: p.name }) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manually verify — customer shop end-to-end**

Navigate to `/shop` and open a category.

**Products with a single existing image:**
- Card shows the single image — no dots, no swipe — exactly as before ✓
- Tapping the card opens the lightbox, showing the single image
- Review button in the lightbox opens the ReviewModal ✓

**Products with multiple images (add a second image via Edit Product first):**
- Card image area shows dots at the bottom
- Swiping left/right on the card changes the slide
- Tapping dots navigates to that slide
- Tapping the card opens the lightbox with all slides, swiping works there too

**Products with no image:**
- Card shows the letter fallback — no dots
- Tapping opens lightbox with letter fallback

**Sold-out products:**
- "Sold Out" badge visible, cursor-not-allowed, tapping does NOT open the lightbox ✓

- [ ] **Step 3: Commit**

```bash
git add src/pages/CustomerCategory.jsx
git commit -m "feat: swipeable media slider and product lightbox on customer shop"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| `product_images` table, additive | Task 1 |
| `products.image_url` never altered | Tasks 4, 5 (image_url only written when previously null) |
| `MediaSlider` component, touch swipe, dots | Task 2 |
| `MediaUploadSection`, max 10, removable items | Task 3 |
| `ProductMediaModal` customer lightbox | Task 6 |
| AddProductModal multi-file | Task 4 |
| EditProductModal load existing + add/remove | Task 5 |
| CustomerCategory slider on cards | Task 7 |
| CustomerCategory tap → lightbox | Task 7 |
| Review button works from lightbox | Task 7 |
| No new npm packages | All tasks — only React + Supabase JS used |
| No new storage bucket | Tasks 4, 5 — `product-images` bucket reused |
