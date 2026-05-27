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
