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
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
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
