# Edit Functionality + Aesthetic Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit modals for categories and products, plus aesthetic improvements (empty states, stat card tints, active navbar, login divider, summary strips).

**Architecture:** Two new modal components (`EditCategoryModal`, `EditProductModal`) following the exact same upload pattern as the existing Add modals. Card pages get a hover pencil button using Tailwind's `group`/`group-hover` pattern. Aesthetic changes are surgical edits to existing pages.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, @supabase/supabase-js

**Base commit:** `db87fe2`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/EditCategoryModal.jsx` | Create | Edit category name + photo |
| `src/components/EditProductModal.jsx` | Create | Edit product name + photo |
| `src/pages/Categories.jsx` | Modify | Edit button on cards, portfolio strip, empty state |
| `src/pages/Products.jsx` | Modify | Edit button on cards, summary bar, empty state |
| `src/pages/ProductDetail.jsx` | Modify | Color-tinted stat cards |
| `src/components/Navbar.jsx` | Modify | Active link highlight |
| `src/pages/Login.jsx` | Modify | Decorative gold divider |

---

## Task 1: EditCategoryModal

**Files:**
- Create: `src/components/EditCategoryModal.jsx`

- [ ] **Step 1: Create `src/components/EditCategoryModal.jsx`**

```jsx
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function EditCategoryModal({ category, onClose, onUpdated }) {
  const [name, setName] = useState(category.name)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setError('')
    setImageFile(file)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let image_url = category.image_url
    let uploadedPath = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      uploadedPath = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(uploadedPath, imageFile)
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data } = supabase.storage.from('category-images').getPublicUrl(uploadedPath)
      image_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('categories')
      .update({ name: name.trim(), image_url })
      .eq('id', category.id)
    setLoading(false)
    if (updateError) {
      if (uploadedPath) await supabase.storage.from('category-images').remove([uploadedPath])
      setError(updateError.message)
      return
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    onUpdated()
    onClose()
  }

  const currentImage = imagePreview ?? category.image_url

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
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
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {currentImage ? (
              <div className="flex items-center gap-3">
                <img src={currentImage} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-xs text-brand-green hover:underline"
                >
                  Change photo
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
              {loading ? 'Saving...' : 'Save Changes'}
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
git add src/components/EditCategoryModal.jsx
git commit -m "feat: add EditCategoryModal"
```

---

## Task 2: EditProductModal

**Files:**
- Create: `src/components/EditProductModal.jsx`

- [ ] **Step 1: Create `src/components/EditProductModal.jsx`**

```jsx
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function EditProductModal({ product, onClose, onUpdated }) {
  const [name, setName] = useState(product.name)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setError('')
    setImageFile(file)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let image_url = product.image_url
    let uploadedPath = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      uploadedPath = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(uploadedPath, imageFile)
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data } = supabase.storage.from('product-images').getPublicUrl(uploadedPath)
      image_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ name: name.trim(), image_url })
      .eq('id', product.id)
    setLoading(false)
    if (updateError) {
      if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
      setError(updateError.message)
      return
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    onUpdated()
    onClose()
  }

  const currentImage = imagePreview ?? product.image_url

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
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
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {currentImage ? (
              <div className="flex items-center gap-3">
                <img src={currentImage} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-xs text-brand-green hover:underline"
                >
                  Change photo
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
              {loading ? 'Saving...' : 'Save Changes'}
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
git add src/components/EditProductModal.jsx
git commit -m "feat: add EditProductModal"
```

---

## Task 3: Categories.jsx — edit button, portfolio strip, empty state

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

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
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
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
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
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                    className="absolute top-2 right-2 bg-brand-cream hover:bg-brand-border rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
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
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onUpdated={fetchCategories}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Categories.jsx
git commit -m "feat: category cards — edit button, portfolio strip, improved empty state"
```

---

## Task 4: Products.jsx — edit button, summary bar, empty state

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

  const totalStock = products.reduce((sum, p) => sum + computeSummary(p).stock, 0)
  const totalProfit = products.reduce((sum, p) => sum + computeSummary(p).profit, 0)

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
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditingProduct(product) }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
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
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Products.jsx
git commit -m "feat: product cards — edit button, summary bar, improved empty state"
```

---

## Task 5: Aesthetic Polish — ProductDetail, Navbar, Login

**Files:**
- Modify: `src/pages/ProductDetail.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/pages/Login.jsx`

### 5a — ProductDetail.jsx: color-tinted stat cards

- [ ] **Step 1: Update stat cards array in `src/pages/ProductDetail.jsx`**

Find this block (around line 57–69):

```jsx
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Stock', value: `${stock} units` },
            { label: 'Total Cost', value: `₹${totalCost.toFixed(2)}` },
            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}` },
            { label: 'Profit', value: `₹${profit.toFixed(2)}`, color: profit >= 0 ? 'text-brand-green' : 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-brand-border p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-lg font-semibold ${color ?? 'text-gray-800'}`}>{value}</p>
            </div>
          ))}
        </div>
```

Replace with:

```jsx
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Stock', value: `${stock} units`, bg: 'bg-brand-green/5 border-brand-green/20', color: 'text-brand-green' },
            { label: 'Total Cost', value: `₹${totalCost.toFixed(2)}`, bg: 'bg-white border-brand-border', color: 'text-gray-800' },
            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, bg: 'bg-brand-gold/10 border-brand-gold/20', color: 'text-gray-800' },
            { label: 'Profit', value: `₹${profit.toFixed(2)}`, bg: profit >= 0 ? 'bg-brand-green/5 border-brand-green/20' : 'bg-red-50 border-red-200', color: profit >= 0 ? 'text-brand-green' : 'text-red-500' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} className={`rounded-lg border p-4 ${bg}`}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-lg font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
```

### 5b — Navbar.jsx: active link highlight

- [ ] **Step 2: Replace `src/components/Navbar.jsx`**

```jsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')

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
      <button onClick={handleLogout} className="text-sm text-brand-gold/50 hover:text-brand-gold/80">
        Logout
      </button>
    </nav>
  )
}
```

### 5c — Login.jsx: decorative divider

- [ ] **Step 3: Update `src/pages/Login.jsx`**

Find this line (around line 30):
```jsx
        <p className="text-gray-400 mb-6 text-xs tracking-widest uppercase">Timeless Style. Refined for You.</p>
```

Replace with:
```jsx
        <p className="text-gray-400 mb-4 text-xs tracking-widest uppercase">Timeless Style. Refined for You.</p>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-brand-gold/30" />
          <span className="text-brand-gold/50 text-xs">✦</span>
          <div className="flex-1 h-px bg-brand-gold/30" />
        </div>
```

- [ ] **Step 4: Commit all three**

```bash
git add src/pages/ProductDetail.jsx src/components/Navbar.jsx src/pages/Login.jsx
git commit -m "feat: aesthetic polish — colored stat cards, active nav, login divider"
```

---

## Task 6: Build Verification

- [ ] **Step 1: Run build**

```bash
cd C:\Users\aadhi\Documents\Projects\levaro-tracker
npm run build
```

Expected: Exit 0. Chunk-size warning is acceptable.

- [ ] **Step 2: Commit build confirmation (no code change needed — just verify)**

If build passes, report DONE. Do NOT run the deploy — user will run `.\deploy.ps1` manually.
