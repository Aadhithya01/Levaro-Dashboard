# Categories + UI Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Categories layer above Products (Kada, Chain, Bangle, etc.) and rebrand the entire UI to Levaro's dark-green + gold + warm-cream color scheme.

**Architecture:** New `categories` table in Supabase. Products gain a nullable `category_id` FK. Home route becomes a Categories icon-grid page; products are now accessed via `/categories/:categoryId`. All indigo Tailwind classes are replaced with a custom `brand` palette defined in `tailwind.config.js`.

**Tech Stack:** React 18, Vite, Tailwind CSS v3 (custom colors), React Router v6, @supabase/supabase-js, Supabase MCP tools

**Base commit:** `d5d4f58`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/schema.sql` | Modify | Document new migration |
| `tailwind.config.js` | Modify | Add `brand` color palette |
| `src/pages/Categories.jsx` | **Create** | Home page — icon card grid |
| `src/components/AddCategoryModal.jsx` | **Create** | Modal to add a new category |
| `src/App.jsx` | Modify | Add `/categories/:categoryId` route, swap home to Categories |
| `src/components/Navbar.jsx` | Modify | Rebrand colors + Products→Categories link |
| `src/pages/Products.jsx` | Modify | Accept `categoryId` from route, filter, back link |
| `src/components/AddProductModal.jsx` | Modify | Accept + pass `categoryId` on insert |
| `src/pages/Login.jsx` | Modify | Rebrand colors only |
| `src/pages/ProductDetail.jsx` | Modify | Rebrand colors only |
| `src/pages/Dashboard.jsx` | Modify | Rebrand colors + chart colors |
| `src/components/AddPurchaseModal.jsx` | Modify | Rebrand colors only |
| `src/components/AddSaleModal.jsx` | Modify | Rebrand colors only |

---

## Task 1: DB Migration — Add Categories Table + category_id to Products

**Files:**
- Modify: `supabase/schema.sql`
- Apply via: `mcp__claude_ai_Supabase__apply_migration` (project_id: `cergignhfwrkxgamzfwd`)

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with:
- `project_id`: `cergignhfwrkxgamzfwd`
- `name`: `add_categories`
- `query`:
```sql
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can do everything on categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Expected: `{"success": true}`

- [ ] **Step 2: Update supabase/schema.sql to document the migration**

Append to `supabase/schema.sql`:
```sql

-- Migration: add_categories (2026-05-27)
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can do everything on categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add categories table and category_id to products"
```

---

## Task 2: Tailwind Brand Color Palette

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace tailwind.config.js with brand colors**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1a5c45',
          gold: '#e8c96a',
          cream: '#faf7f0',
          border: '#e8e0d0',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify build still passes**

```bash
cd C:\Users\aadhi\Documents\Projects\levaro-tracker
npm run build
```

Expected: Build completes successfully (exit 0).

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add brand color palette to tailwind config"
```

---

## Task 3: AddCategoryModal Component

**Files:**
- Create: `src/components/AddCategoryModal.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddCategoryModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('categories').insert({ name: name.trim() })
    setLoading(false)
    if (error) { setError(error.message); return }
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
git commit -m "feat: add AddCategoryModal component"
```

---

## Task 4: Categories Page

**Files:**
- Create: `src/pages/Categories.jsx`

- [ ] **Step 1: Create the file**

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
              return (
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
git commit -m "feat: add Categories page with icon card grid"
```

---

## Task 5: Update App.jsx + Navbar

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Replace src/App.jsx**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Categories from './pages/Categories'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/categories/:categoryId" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Replace src/components/Navbar.jsx**

```jsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-brand-green px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-gold text-lg tracking-widest">LEVARO</span>
        <Link to="/" className="text-sm text-brand-gold/80 hover:text-brand-gold">Categories</Link>
        <Link to="/dashboard" className="text-sm text-brand-gold/80 hover:text-brand-gold">Dashboard</Link>
      </div>
      <button onClick={handleLogout} className="text-sm text-brand-gold/50 hover:text-brand-gold/80">
        Logout
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/Navbar.jsx
git commit -m "feat: wire up Categories route and rebrand navbar"
```

---

## Task 6: Update Products Page + AddProductModal

**Files:**
- Modify: `src/pages/Products.jsx`
- Modify: `src/components/AddProductModal.jsx`

- [ ] **Step 1: Replace src/pages/Products.jsx**

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
  return { totalCost, totalRevenue, stock, profit }
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
          <div className="bg-white rounded-lg shadow overflow-hidden border border-brand-border">
            <table className="w-full text-sm">
              <thead className="bg-brand-green">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Stock</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Total Cost (₹)</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Revenue (₹)</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {products.map(product => {
                  const { totalCost, totalRevenue, stock, profit } = computeSummary(product)
                  return (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="hover:bg-brand-cream cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{stock}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{totalRevenue.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                        ₹{profit.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

- [ ] **Step 2: Replace src/components/AddProductModal.jsx**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('products').insert({ name: name.trim(), category_id: categoryId })
    setLoading(false)
    if (error) { setError(error.message); return }
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

- [ ] **Step 3: Commit**

```bash
git add src/pages/Products.jsx src/components/AddProductModal.jsx
git commit -m "feat: Products page accepts categoryId, AddProductModal passes it on insert"
```

---

## Task 7: Rebrand Login Page

**Files:**
- Modify: `src/pages/Login.jsx`

- [ ] **Step 1: Replace src/pages/Login.jsx**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await login(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-brand-green flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand-green mb-1 tracking-widest">LEVARO</h1>
        <p className="text-gray-400 mb-6 text-xs tracking-widest uppercase">Timeless Style. Refined for You.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-brand-gold rounded py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Login.jsx
git commit -m "feat: rebrand login page to Levaro green/gold"
```

---

## Task 8: Rebrand ProductDetail + Modals

**Files:**
- Modify: `src/pages/ProductDetail.jsx`
- Modify: `src/components/AddPurchaseModal.jsx`
- Modify: `src/components/AddSaleModal.jsx`

- [ ] **Step 1: Replace src/pages/ProductDetail.jsx**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddPurchaseModal from '../components/AddPurchaseModal'
import AddSaleModal from '../components/AddSaleModal'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showSale, setShowSale] = useState(false)

  async function fetchData() {
    const [{ data: prod }, { data: purch }, { data: sale }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('purchases').select('*').eq('product_id', id).order('date_of_purchase', { ascending: false }),
      supabase.from('sales').select('*').eq('product_id', id).order('sale_date', { ascending: false }),
    ])
    setProduct(prod)
    setPurchases(purch ?? [])
    setSales(sale ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  if (loading) return <div className="min-h-screen bg-brand-cream"><Navbar /><p className="p-8 text-gray-500 text-sm">Loading...</p></div>
  if (!product) return <div className="min-h-screen bg-brand-cream"><Navbar /><p className="p-8 text-gray-500 text-sm">Product not found.</p></div>

  const totalCost = purchases.reduce((sum, p) => sum + p.quantity * p.price_per_piece, 0)
  const totalPurchasedQty = purchases.reduce((sum, p) => sum + p.quantity, 0)
  const totalSoldQty = sales.reduce((sum, s) => sum + s.quantity_sold, 0)
  const totalRevenue = sales.reduce((sum, s) => sum + s.quantity_sold * s.selling_price, 0)
  const stock = totalPurchasedQty - totalSoldQty
  const profit = totalRevenue - totalCost

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="text-sm text-brand-green hover:underline mb-4 block">← Back</button>
        <h1 className="text-xl font-bold text-brand-green mb-2">{product.name}</h1>

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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-green">Purchases</h2>
            <button onClick={() => setShowPurchase(true)} className="text-sm bg-brand-green text-brand-gold px-3 py-1.5 rounded hover:opacity-90">+ Add Purchase</button>
          </div>
          {purchases.length === 0 ? (
            <p className="text-gray-400 text-sm">No purchases yet.</p>
          ) : (
            <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-green">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Price/Piece (₹)</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-gray-700">{p.date_of_purchase}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{Number(p.price_per_piece).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">₹{(p.quantity * p.price_per_piece).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-green">Sales</h2>
            <button onClick={() => setShowSale(true)} className="text-sm bg-brand-green text-brand-gold px-3 py-1.5 rounded hover:opacity-90">+ Add Sale</button>
          </div>
          {sales.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales yet.</p>
          ) : (
            <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-green">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Selling Price (₹)</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-gray-700">{s.sale_date}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{s.quantity_sold}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{Number(s.selling_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-green">₹{(s.quantity_sold * s.selling_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showPurchase && <AddPurchaseModal productId={id} onClose={() => setShowPurchase(false)} onAdded={fetchData} />}
      {showSale && <AddSaleModal productId={id} onClose={() => setShowSale(false)} onAdded={fetchData} />}
    </div>
  )
}
```

- [ ] **Step 2: Replace src/components/AddPurchaseModal.jsx**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddPurchaseModal({ productId, onClose, onAdded }) {
  const [form, setForm] = useState({ date_of_purchase: '', quantity: '', price_per_piece: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('purchases').insert({
      product_id: productId,
      date_of_purchase: form.date_of_purchase,
      quantity: parseInt(form.quantity),
      price_per_piece: parseFloat(form.price_per_piece),
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Purchase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Purchase</label>
            <input type="date" required value={form.date_of_purchase} onChange={e => set('date_of_purchase', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" min="1" required value={form.quantity} onChange={e => set('quantity', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Piece (₹)</label>
            <input type="number" min="0.01" step="0.01" required value={form.price_per_piece} onChange={e => set('price_per_piece', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 120.00" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace src/components/AddSaleModal.jsx**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddSaleModal({ productId, onClose, onAdded }) {
  const [form, setForm] = useState({ sale_date: '', quantity_sold: '', selling_price: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('sales').insert({
      product_id: productId,
      sale_date: form.sale_date,
      quantity_sold: parseInt(form.quantity_sold),
      selling_price: parseFloat(form.selling_price),
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input type="date" required value={form.sale_date} onChange={e => set('sale_date', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
            <input type="number" min="1" required value={form.quantity_sold} onChange={e => set('quantity_sold', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price per Piece (₹)</label>
            <input type="number" min="0.01" step="0.01" required value={form.selling_price} onChange={e => set('selling_price', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250.00" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProductDetail.jsx src/components/AddPurchaseModal.jsx src/components/AddSaleModal.jsx
git commit -m "feat: rebrand ProductDetail and purchase/sale modals"
```

---

## Task 9: Rebrand Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Replace src/pages/Dashboard.jsx**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [salesOverTime, setSalesOverTime] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('products')
        .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price, sale_date)')
      const prods = data ?? []
      setProducts(prods)

      const byDate = {}
      prods.forEach(p => {
        p.sales.forEach(s => {
          const date = s.sale_date
          byDate[date] = (byDate[date] ?? 0) + s.quantity_sold * s.selling_price
        })
      })
      const sorted = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }))
      setSalesOverTime(sorted)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const stockData = products.map(p => ({
    name: p.name,
    stock: p.purchases.reduce((s, x) => s + x.quantity, 0) - p.sales.reduce((s, x) => s + x.quantity_sold, 0),
  }))

  const profitData = products.map(p => ({
    name: p.name,
    profit: parseFloat((
      p.sales.reduce((s, x) => s + x.quantity_sold * x.selling_price, 0) -
      p.purchases.reduce((s, x) => s + x.quantity * x.price_per_piece, 0)
    ).toFixed(2)),
  }))

  if (loading) return <div className="min-h-screen bg-brand-cream"><Navbar /><p className="p-8 text-gray-500 text-sm">Loading...</p></div>

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <h1 className="text-xl font-bold text-brand-green">Dashboard</h1>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Stock Levels</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#1a5c45" name="Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Profit per Product (₹)</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `₹${v}`} />
                <Bar dataKey="profit" fill="#e8c96a" name="Profit (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Sales Revenue Over Time (₹)</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            {salesOverTime.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No sales data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₹${v}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#1a5c45" name="Revenue (₹)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: rebrand Dashboard with brand colors and chart palette"
```

---

## Task 10: Final Build Verification

- [ ] **Step 1: Run build**

```bash
cd C:\Users\aadhi\Documents\Projects\levaro-tracker
npm run build
```

Expected: Build completes successfully, no errors. Warnings about chunk size are acceptable.

- [ ] **Step 2: Manual verification checklist**

Open `http://localhost:5173` (run `npm run dev` if needed):

1. **Login page** — dark green background, white card, LEVARO heading with tagline, gold-tinted button
2. **After login** — Categories page with icon grid (empty state: "No categories yet")
3. **Add Category** — type "Kada", submit → "K" avatar card appears
4. **Click Kada** — Products page with "Kada" as title, "← Back to Categories" link
5. **Add Product** — type "Gold Kada 22KT", submit → appears in table
6. **Click product** → Product Detail page, purchases/sales empty, both "+ Add" buttons work
7. **Dashboard** → green/gold chart colors

- [ ] **Step 3: Apply migration to Supabase (if not done in Task 1)**

Confirm via Supabase MCP `list_tables` that `categories` table exists and `products` has `category_id` column.

- [ ] **Step 4: Deploy to Netlify**

Get fresh deploy command:
- Call `mcp__claude_ai_Netlify__netlify-deploy-services-updater` with `deploy-site` operation and `siteId: 5233958e-f16b-4127-97de-e8878d84e67c`
- Run the returned `npx` command from the project root
- Verify live site at `https://levaro-tracker.netlify.app`
