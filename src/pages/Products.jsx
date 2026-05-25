import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price)')
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Products</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
          >
            + Add Product
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-sm">No products yet. Add your first product.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Cost (₹)</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Revenue (₹)</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(product => {
                  const { totalCost, totalRevenue, stock, profit } = computeSummary(product)
                  return (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="hover:bg-indigo-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{stock}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{totalRevenue.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
          onClose={() => setShowModal(false)}
          onAdded={fetchProducts}
        />
      )}
    </div>
  )
}
