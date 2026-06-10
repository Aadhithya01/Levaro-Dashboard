import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddPurchaseModal from '../components/AddPurchaseModal'
import EditPurchaseModal from '../components/EditPurchaseModal'
import AddSaleModal from '../components/AddSaleModal'
import EditSaleModal from '../components/EditSaleModal'
import MediaSlider from '../components/MediaSlider'
import ImageZoomModal from '../components/ImageZoomModal'

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [productImages, setProductImages] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showSale, setShowSale] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const [reviews, setReviews] = useState([])
  const [zoomOpen, setZoomOpen] = useState(false)

  async function fetchData() {
    const [{ data: prod }, { data: purch }, { data: sale }, { data: rev }, { data: imgs }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('purchases').select('*').eq('product_id', id).order('date_of_purchase', { ascending: false }),
      supabase.from('sales').select('*').eq('product_id', id).order('sale_date', { ascending: false }),
      supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }),
      supabase.from('product_images').select('media_url, media_type, sort_order').eq('product_id', id).order('sort_order'),
    ])
    setProduct(prod)
    setPurchases(purch ?? [])
    setSales(sale ?? [])
    setReviews(rev ?? [])
    setProductImages(imgs ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  if (loading) return <div className="min-h-screen"><Navbar /><p className="p-8 text-gray-500 text-sm">Loading...</p></div>
  if (!product) return <div className="min-h-screen"><Navbar /><p className="p-8 text-gray-500 text-sm">Product not found.</p></div>

  const totalCost = purchases.reduce((sum, p) => sum + p.quantity * p.price_per_piece, 0)
  const totalPurchasedQty = purchases.reduce((sum, p) => sum + p.quantity, 0)
  const totalSoldQty = sales.reduce((sum, s) => sum + s.quantity_sold, 0)
  const totalRevenue = sales.reduce((sum, s) => sum + s.quantity_sold * s.selling_price, 0)
  const stock = totalPurchasedQty - totalSoldQty
  const profit = totalRevenue - totalCost

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <button onClick={() => navigate(-1)} className="text-sm text-brand-green hover:underline mb-4 block">← Back</button>

        {(() => {
          const allMedia = []
          if (product.image_url) allMedia.push({ url: product.image_url, type: 'image' })
          productImages.forEach(img => allMedia.push({ url: img.media_url, type: img.media_type }))
          return allMedia.length > 0 ? (
            <div className="flex gap-6 items-start mb-6">
              <div className="relative flex-shrink-0 w-52 h-52 rounded-xl overflow-hidden bg-gray-50 border border-brand-border group">
                <MediaSlider items={allMedia} objectFit="contain" />
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View full size"
                >
                  <EyeIcon />
                </button>
              </div>
              <div className="pt-1">
                <h1 className="text-xl font-bold text-brand-green mb-1">{product.name}</h1>
                {product.code && <p className="text-sm text-gray-400 font-mono mb-2">{product.code}</p>}
                <p className="text-xs text-gray-400">Double-tap or use eye icon to zoom</p>
              </div>
              {zoomOpen && <ImageZoomModal items={allMedia} onClose={() => setZoomOpen(false)} />}
            </div>
          ) : null
        })()}

        {!product.image_url && productImages.length === 0 && (
          <h1 className="text-xl font-bold text-brand-green mb-2">{product.name}</h1>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-green">Stock Purchases</h2>
            <button onClick={() => setShowPurchase(true)} className="text-sm bg-brand-green text-brand-gold px-3 py-1.5 rounded hover:opacity-90">+ Add Stock</button>
          </div>
          {purchases.length === 0 ? (
            <p className="text-gray-400 text-sm">No stock entries yet.</p>
          ) : (
            <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-brand-green">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Price / Piece (₹)</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Total (₹)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-gray-700">{p.date_of_purchase}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{Number(p.price_per_piece).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-green">₹{(p.quantity * p.price_per_piece).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditingPurchase(p)}
                          className="text-xs text-brand-green hover:underline"
                        >
                          Edit
                        </button>
                      </td>
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
            <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-brand-green">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Selling Price (₹)</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Revenue (₹)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 text-gray-700">{s.sale_date}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{s.quantity_sold}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{Number(s.selling_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-green">₹{(s.quantity_sold * s.selling_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditingSale(s)} className="text-xs text-brand-green hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-brand-green mb-3">
            Customer Reviews <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>
          </h2>
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-lg border border-brand-border px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{r.reviewer_name}</span>
                      <span className="text-brand-gold text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <span className="text-xs text-gray-400">{r.created_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPurchase && <AddPurchaseModal productId={id} onClose={() => setShowPurchase(false)} onAdded={fetchData} />}
      {editingPurchase && <EditPurchaseModal purchase={editingPurchase} onClose={() => setEditingPurchase(null)} onUpdated={fetchData} />}
      {showSale && <AddSaleModal productId={id} defaultSellingPrice={product.selling_price} onClose={() => setShowSale(false)} onAdded={fetchData} />}
      {editingSale && <EditSaleModal sale={editingSale} onClose={() => setEditingSale(null)} onUpdated={fetchData} />}
    </div>
  )
}
