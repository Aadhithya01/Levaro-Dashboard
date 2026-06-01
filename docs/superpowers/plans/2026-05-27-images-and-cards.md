# Images + Product Card Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional photo upload to categories and products; replace the products table with a full-photo card grid matching the categories grid style.

**Architecture:** Two new `image_url text` columns (nullable) on `categories` and `products`. Two Supabase Storage public buckets (`category-images`, `product-images`). File is uploaded on form submit, public URL stored in DB. Categories and products render as full-photo square cards with dark gradient overlay; no-image fallback shows letter initial.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, @supabase/supabase-js (storage + DB), Supabase MCP tools

**Base commit:** `c47ce13`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/schema.sql` | Modify | Document migration |
| `src/components/AddCategoryModal.jsx` | Modify | Add image file picker + upload |
| `src/components/AddProductModal.jsx` | Modify | Add image file picker + upload |
| `src/pages/Categories.jsx` | Modify | Conditional photo card vs letter card |
| `src/pages/Products.jsx` | Modify | Replace table with photo card grid |
| `src/pages/ProductDetail.jsx` | Modify | Add image banner at top |

---

## Task 1: DB Migration + Storage Buckets

**Files:**
- Modify: `supabase/schema.sql`
- Apply via: `mcp__claude_ai_Supabase__apply_migration` (project_id: `cergignhfwrkxgamzfwd`)

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with:
- `project_id`: `cergignhfwrkxgamzfwd`
- `name`: `add_image_urls_and_storage_buckets`
- `query`:
```sql
ALTER TABLE categories ADD COLUMN image_url text;
ALTER TABLE products ADD COLUMN image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('category-images', 'category-images', true),
  ('product-images',  'product-images',  true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload category images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
```

Expected: `{"success": true}`

- [ ] **Step 2: Append to `supabase/schema.sql`**

Append this block:
```sql

-- Migration: add_image_urls_and_storage_buckets (2026-05-27)
ALTER TABLE categories ADD COLUMN image_url text;
ALTER TABLE products ADD COLUMN image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('category-images', 'category-images', true),
  ('product-images',  'product-images',  true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload category images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add image_url columns and storage buckets"
```

---

## Task 2: AddCategoryModal — Image Upload

**Files:**
- Modify: `src/components/AddCategoryModal.jsx`

- [ ] **Step 1: Replace `src/components/AddCategoryModal.jsx`**

```jsx
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AddCategoryModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let image_url = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(path, imageFile)
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data } = supabase.storage.from('category-images').getPublicUrl(path)
      image_url = data.publicUrl
    }

    const { error: insertError } = await supabase
      .from('categories')
      .insert({ name: name.trim(), ...(image_url && { image_url }) })
    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. Kada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
              >
                📷 Add photo
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AddCategoryModal.jsx
git commit -m "feat: add optional image upload to AddCategoryModal"
```

---

## Task 3: AddProductModal — Image Upload

**Files:**
- Modify: `src/components/AddProductModal.jsx`

- [ ] **Step 1: Replace `src/components/AddProductModal.jsx`**

```jsx
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let image_url = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile)
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      image_url = data.publicUrl
    }

    const { error: insertError } = await supabase
      .from('products')
      .insert({ name: name.trim(), category_id: categoryId, ...(image_url && { image_url }) })
    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
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
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
              >
                📷 Add photo
              </button>
            )}
          </div>
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

- [ ] **Step 2: Commit**

```bash
git add src/components/AddProductModal.jsx
git commit -m "feat: add optional image upload to AddProductModal"
```

---

## Task 4: Categories Page — Conditional Photo Card

**Files:**
- Modify: `src/pages/Categories.jsx`

- [ ] **Step 1: Replace `src/pages/Categories.jsx`**

Replace the entire file with:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddCategoryModal from '../components/AddCategoryModal'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(count)')
      .order('created_at', { ascending: true })
    if (error) { console.error('Failed to fetch categories:', error); setLoading(false); return }
    setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-brand-green">Categories</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Category
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500 text-sm">No categories yet. Add your first one.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => {
              const count = cat.products?.[0]?.count ?? 0
              return cat.image_url ? (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-brand-green transition-all shadow-sm"
                >
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="font-bold text-white text-sm">{cat.name}</p>
                    <p className="text-xs text-brand-gold mt-0.5">{count} product{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="bg-white rounded-xl p-6 flex flex-col items-center cursor-pointer border border-brand-border hover:border-brand-green hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-brand-gold">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{count} product{count !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddCategoryModal
          onClose={() => setShowModal(false)}
          onAdded={fetchCategories}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Categories.jsx
git commit -m "feat: categories show full-photo card when image set"
```

---

## Task 5: Products Page — Photo Card Grid

**Files:**
- Modify: `src/pages/Products.jsx`

- [ ] **Step 1: Replace `src/pages/Products.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddProductModal from '../components/AddProductModal'

function computeSummary(product) {
  const totalCost = product.purchases.reduce((sum, p) => sum + p.quantity * p.price_per_piece, 0)
  const totalPurchasedQty = product.purchases.reduce((sum, p) => sum + p.quantity, 0)
  const totalSoldQty = product.sales.reduce((sum, s) => sum + s.quantity_sold, 0)
  const totalRevenue = product.sales.reduce((sum, s) => sum + s.quantity_sold * s.selling_price, 0)
  const stock = totalPurchasedQty - totalSoldQty
  const profit = totalRevenue - totalCost
  return { stock, profit }
}

export default function Products() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchData() {
    const [{ data: cat }, { data: prods, error }] = await Promise.all([
      supabase.from('categories').select('name').eq('id', categoryId).single(),
      supabase
        .from('products')
        .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price)')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false }),
    ])
    setCategory(cat)
    if (error) { console.error('Failed to fetch products:', error); setLoading(false); return }
    setProducts(prods ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [categoryId])

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/')} className="text-sm text-brand-green hover:underline mb-4 block">
          ← Back to Categories
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-brand-green">{category?.name ?? 'Products'}</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Product
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-sm">No products yet. Add your first product.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products.map(product => {
              const { stock, profit } = computeSummary(product)
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-brand-green transition-all shadow-sm"
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-green/20 flex items-center justify-center">
                      <span className="text-4xl font-bold text-brand-green/40">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="font-bold text-white text-sm truncate">{product.name}</p>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-white/70">{stock} left</span>
                      <span className={`text-xs font-semibold ${profit >= 0 ? 'text-brand-gold' : 'text-red-400'}`}>
                        ₹{profit.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddProductModal
          categoryId={categoryId}
          onClose={() => setShowModal(false)}
          onAdded={fetchData}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Products.jsx
git commit -m "feat: products display as photo card grid"
```

---

## Task 6: ProductDetail — Image Banner

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Add image banner after the back button**

In `src/pages/ProductDetail.jsx`, find this block (around line 46–47):

```jsx
        <button onClick={() => navigate(-1)} className="text-sm text-brand-green hover:underline mb-4 block">← Back</button>
        <h1 className="text-xl font-bold text-brand-green mb-2">{product.name}</h1>
```

Replace it with:

```jsx
        <button onClick={() => navigate(-1)} className="text-sm text-brand-green hover:underline mb-4 block">← Back</button>
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <h1 className="text-xl font-bold text-brand-green mb-2">{product.name}</h1>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProductDetail.jsx
git commit -m "feat: show product image banner on detail page"
```

---

## Task 7: Build Verification + Deploy

- [ ] **Step 1: Run build**

```bash
cd C:\Users\aadhi\Documents\Projects\levaro-tracker
npm run build
```

Expected: Build completes with exit 0. Chunk-size warning is acceptable.

- [ ] **Step 2: Deploy to Netlify**

Get a fresh deploy token:
- Call `mcp__claude_ai_Netlify__netlify-deploy-services-updater` with `deploy-site` and `siteId: 5233958e-f16b-4127-97de-e8878d84e67c`
- Write the returned `npx` command to `deploy.ps1`
- If the Netlify MCP is unavailable, fall back to: `npx netlify-cli deploy --prod --dir dist --site 5233958e-f16b-4127-97de-e8878d84e67c` (requires the user to be logged in via `npx netlify-cli login`)

Note: Do NOT run the deploy command yourself — write it to `deploy.ps1` and report back. The user will run it from their PowerShell terminal.
