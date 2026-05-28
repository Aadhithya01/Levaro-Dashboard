# Delete + User Profile Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete for categories/products (with name-confirmation for categories) and a user profile dropdown in the navbar for avatar upload and password change.

**Architecture:** Three new modal/dropdown components following existing patterns. Categories and Products pages get a second hover icon (trash) alongside the existing pencil. Navbar's logout button becomes an avatar circle that toggles a dropdown. Avatars stored in a new Supabase `avatars` bucket.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, @supabase/supabase-js, React Router v6

**Base commit:** Run `git log --oneline -1` to confirm current HEAD before starting.

---

## File Map

| File | Action |
|---|---|
| `src/components/DeleteCategoryModal.jsx` | Create |
| `src/components/DeleteProductModal.jsx` | Create |
| `src/components/ProfileDropdown.jsx` | Create |
| `src/pages/Categories.jsx` | Modify — trash icon, deletingCategory state |
| `src/pages/Products.jsx` | Modify — trash icon, deletingProduct state |
| `src/components/Navbar.jsx` | Modify — avatar circle, ProfileDropdown |
| `supabase/schema.sql` | Modify — avatars bucket migration |

---

## Task 1: Supabase — avatars storage bucket

**Files:**
- Modify: `supabase/schema.sql`
- Apply migration via MCP

- [ ] **Step 1: Append migration to `supabase/schema.sql`**

Add this block at the bottom of `supabase/schema.sql`:

```sql
-- Migration: add_avatars_bucket (2026-05-28)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can manage own avatar"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `cergignhfwrkxgamzfwd`
- `name`: `add_avatars_bucket`
- `query`: the SQL block above

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add avatars storage bucket"
```

---

## Task 2: DeleteCategoryModal

**Files:**
- Create: `src/components/DeleteCategoryModal.jsx`

- [ ] **Step 1: Create `src/components/DeleteCategoryModal.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteCategoryModal({ category, productCount, onClose, onDeleted }) {
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const matches = confirmName === category.name

  async function handleDelete() {
    setLoading(true)
    setError('')

    const { data: products } = await supabase
      .from('products')
      .select('id, image_url')
      .eq('category_id', category.id)

    if (products && products.length > 0) {
      const { error: prodError } = await supabase
        .from('products')
        .delete()
        .in('id', products.map(p => p.id))
      if (prodError) { setError(prodError.message); setLoading(false); return }
    }

    const { error: catError } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
    if (catError) { setError(catError.message); setLoading(false); return }

    const productImagePaths = (products ?? [])
      .map(p => p.image_url?.split('/product-images/')[1])
      .filter(Boolean)
    if (productImagePaths.length > 0) {
      await supabase.storage.from('product-images').remove(productImagePaths)
    }
    if (category.image_url) {
      const catPath = category.image_url.split('/category-images/')[1]
      if (catPath) await supabase.storage.from('category-images').remove([catPath])
    }

    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-800">Delete Category</h2>
        </div>

        {productCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-red-700 font-medium">
              This category contains {productCount} product{productCount !== 1 ? 's' : ''}.
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              All products, purchases, and sales will be permanently deleted.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-3">
          Type <span className="font-semibold text-gray-800">{category.name}</span> to confirm deletion.
        </p>
        <input
          type="text"
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          placeholder={category.name}
          className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!matches || loading}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeleteCategoryModal.jsx
git commit -m "feat: add DeleteCategoryModal"
```

---

## Task 3: DeleteProductModal

**Files:**
- Create: `src/components/DeleteProductModal.jsx`

- [ ] **Step 1: Create `src/components/DeleteProductModal.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteProductModal({ product, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasData = product.purchases.length > 0 || product.sales.length > 0

  async function handleDelete() {
    setLoading(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
    if (deleteError) { setError(deleteError.message); setLoading(false); return }

    if (product.image_url) {
      const path = product.image_url.split('/product-images/')[1]
      if (path) await supabase.storage.from('product-images').remove([path])
    }

    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-800">Delete &ldquo;{product.name}&rdquo;?</h2>
        </div>

        {hasData ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-red-700 font-medium">This product has purchase and sale records.</p>
            <p className="text-xs text-red-600 mt-0.5">All associated data will be permanently deleted.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
        )}

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeleteProductModal.jsx
git commit -m "feat: add DeleteProductModal"
```

---

## Task 4: Categories.jsx — trash icon + delete integration

**Files:**
- Modify: `src/pages/Categories.jsx`

- [ ] **Step 1: Replace `src/pages/Categories.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddCategoryModal from '../components/AddCategoryModal'
import EditCategoryModal from '../components/EditCategoryModal'
import DeleteCategoryModal from '../components/DeleteCategoryModal'

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deletingCategory, setDeletingCategory] = useState(null)
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

  const totalProducts = categories.reduce((sum, c) => sum + (c.products?.[0]?.count ?? 0), 0)

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-brand-green">Categories</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Category
          </button>
        </div>

        {!loading && categories.length > 0 && (
          <div className="flex gap-5 mb-6">
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{categories.length}</span>
              <span className="text-gray-400 ml-1">categories</span>
            </div>
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{totalProducts}</span>
              <span className="text-gray-400 ml-1">products total</span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">No categories yet</p>
            <p className="text-gray-400 text-xs mb-5">Create your first category to start organising products</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => {
              const count = cat.products?.[0]?.count ?? 0
              return cat.image_url ? (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-brand-green transition-all shadow-sm"
                >
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="font-bold text-white text-sm">{cat.name}</p>
                    <p className="text-xs text-brand-gold mt-0.5">{count} product{count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                      className="bg-white/90 hover:bg-white rounded-full p-1.5"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeletingCategory(cat) }}
                      className="bg-white/90 hover:bg-red-50 rounded-full p-1.5"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="relative group bg-white rounded-xl p-6 flex flex-col items-center cursor-pointer border border-brand-border hover:border-brand-green hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-brand-gold">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{count} product{count !== 1 ? 's' : ''}</p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                      className="bg-brand-cream hover:bg-brand-border rounded-full p-1.5"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeletingCategory(cat) }}
                      className="bg-brand-cream hover:bg-red-50 rounded-full p-1.5"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddCategoryModal onClose={() => setShowModal(false)} onAdded={fetchCategories} />
      )}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onUpdated={fetchCategories}
        />
      )}
      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          productCount={deletingCategory.products?.[0]?.count ?? 0}
          onClose={() => setDeletingCategory(null)}
          onDeleted={fetchCategories}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Categories.jsx
git commit -m "feat: category cards — delete button and confirmation modal"
```

---

## Task 5: Products.jsx — trash icon + delete integration

**Files:**
- Modify: `src/pages/Products.jsx`

- [ ] **Step 1: Replace `src/pages/Products.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddProductModal from '../components/AddProductModal'
import EditProductModal from '../components/EditProductModal'
import DeleteProductModal from '../components/DeleteProductModal'

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

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
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)

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

  useEffect(() => { fetchData() }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { totalStock, totalProfit } = products.reduce(
    (acc, p) => {
      const { stock, profit } = computeSummary(p)
      return { totalStock: acc.totalStock + stock, totalProfit: acc.totalProfit + profit }
    },
    { totalStock: 0, totalProfit: 0 }
  )

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/')} className="text-sm text-brand-green hover:underline mb-4 block">
          ← Back to Categories
        </button>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-brand-green">{category?.name ?? 'Products'}</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Product
          </button>
        </div>

        {!loading && products.length > 0 && (
          <div className="flex gap-5 mb-6">
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{products.length}</span>
              <span className="text-gray-400 ml-1">products</span>
            </div>
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{totalStock}</span>
              <span className="text-gray-400 ml-1">in stock</span>
            </div>
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className={`font-semibold ${totalProfit >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                ₹{totalProfit.toFixed(0)}
              </span>
              <span className="text-gray-400 ml-1">profit</span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">No products yet</p>
            <p className="text-gray-400 text-xs mb-5">Add your first product to start tracking inventory</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products.map(product => {
              const { stock, profit } = computeSummary(product)
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-brand-green transition-all shadow-sm"
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
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingProduct(product) }}
                      className="bg-white/90 hover:bg-white rounded-full p-1.5"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeletingProduct(product) }}
                      className="bg-white/90 hover:bg-red-50 rounded-full p-1.5"
                    >
                      <TrashIcon />
                    </button>
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
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdated={fetchData}
        />
      )}
      {deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onDeleted={fetchData}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Products.jsx
git commit -m "feat: product cards — delete button and confirmation modal"
```

---

## Task 6: ProfileDropdown + Navbar

**Files:**
- Create: `src/components/ProfileDropdown.jsx`
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Create `src/components/ProfileDropdown.jsx`**

```jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ProfileDropdown({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarMessage('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarMessage('Image must be under 5 MB.'); return }
    setAvatarLoading(true)
    setAvatarMessage('')
    const path = `${user.id}/avatar`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setAvatarMessage(uploadError.message); setAvatarLoading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatar_url = `${data.publicUrl}?t=${Date.now()}`
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url } })
    setAvatarLoading(false)
    if (updateError) { setAvatarMessage(updateError.message); return }
    setAvatarMessage('Avatar updated!')
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwNew !== pwConfirm) { setPwMessage('Passwords do not match.'); return }
    if (pwNew.length < 6) { setPwMessage('Password must be at least 6 characters.'); return }
    setPwLoading(true)
    setPwMessage('')
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwLoading(false)
    if (error) { setPwMessage(error.message); return }
    setPwMessage('Password updated!')
    setPwNew('')
    setPwConfirm('')
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-brand-border z-50 overflow-hidden"
    >
      <div className="bg-brand-green/5 px-4 py-3 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-brand-gold font-bold text-sm">{initials}</span>
            }
          </div>
          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-brand-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          disabled={avatarLoading}
          className="text-xs text-brand-green hover:underline disabled:opacity-50"
        >
          {avatarLoading ? 'Uploading...' : 'Change avatar photo'}
        </button>
        {avatarMessage && (
          <p className={`text-xs mt-1 ${avatarMessage.includes('updated') ? 'text-brand-green' : 'text-red-500'}`}>
            {avatarMessage}
          </p>
        )}
      </div>

      <form onSubmit={handlePasswordChange} className="px-4 py-3 border-b border-brand-border space-y-2">
        <p className="text-xs font-medium text-gray-600">Change password</p>
        <input
          type="password"
          placeholder="New password"
          value={pwNew}
          onChange={e => setPwNew(e.target.value)}
          className="w-full border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={pwConfirm}
          onChange={e => setPwConfirm(e.target.value)}
          className="w-full border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        {pwMessage && (
          <p className={`text-xs ${pwMessage.includes('updated') ? 'text-brand-green' : 'text-red-500'}`}>
            {pwMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={pwLoading || !pwNew || !pwConfirm}
          className="w-full bg-brand-green text-brand-gold text-xs py-1.5 rounded hover:opacity-90 disabled:opacity-40"
        >
          {pwLoading ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full px-4 py-3 text-left text-xs text-red-500 hover:bg-red-50 transition-colors"
      >
        Logout
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/components/Navbar.jsx`**

```jsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileDropdown from './ProfileDropdown'

export default function Navbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-brand-green px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-gold text-lg tracking-widest">LEVARO</span>
        <Link
          to="/"
          className={`text-sm transition-colors ${catActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Categories
        </Link>
        <Link
          to="/dashboard"
          className={`text-sm transition-colors ${dashActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Dashboard
        </Link>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowProfile(v => !v)}
          className="w-8 h-8 rounded-full bg-brand-gold/20 hover:bg-brand-gold/30 flex items-center justify-center overflow-hidden transition-colors"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-brand-gold font-bold text-sm">{initials}</span>
          }
        </button>
        {showProfile && <ProfileDropdown onClose={() => setShowProfile(false)} />}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileDropdown.jsx src/components/Navbar.jsx
git commit -m "feat: user profile dropdown — avatar upload and password change"
```

---

## Task 7: Build Verification

**Files:** None

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Exit 0. Chunk-size warning is acceptable; any TypeScript/JSX error is not.

- [ ] **Step 2: Report result**

If build passes: report DONE. Do NOT deploy — user will run deploy manually.
