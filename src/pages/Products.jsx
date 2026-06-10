import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddProductModal from '../components/AddProductModal'
import EditProductModal from '../components/EditProductModal'
import DeleteProductModal from '../components/DeleteProductModal'
import AddPurchaseModal from '../components/AddPurchaseModal'
import MediaSlider from '../components/MediaSlider'

function buildMedia(product) {
  const items = []
  if (product.image_url) items.push({ url: product.image_url, type: 'image' })
  ;(product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach(img => items.push({ url: img.media_url, type: img.media_type }))
  return items
}

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

const StockIcon = () => (
  <svg className="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
  const [stockingProduct, setStockingProduct] = useState(null)

  async function fetchData() {
    const [{ data: cat }, { data: prods, error }] = await Promise.all([
      supabase.from('categories').select('name').eq('id', categoryId).single(),
      supabase
        .from('products')
        .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price), product_reviews(count), product_images(media_url, media_type, sort_order)')
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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map(product => {
              const { stock, profit } = computeSummary(product)
              const reviewCount = product.product_reviews?.[0]?.count ?? 0
              const allMedia = buildMedia(product)
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="relative group aspect-square rounded-xl cursor-pointer ring-2 ring-transparent hover:ring-brand-green transition-all shadow-sm"
                >
                  {/* Image layer — overflow-hidden scoped here so hover buttons above are never clipped */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {allMedia.length > 0 ? (
                      <MediaSlider items={allMedia} />
                    ) : (
                      <div className="w-full h-full bg-brand-green/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-brand-green/40">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
                      <p className="font-bold text-white text-sm truncate">{product.name}</p>
                      {product.code && <p className="text-xs text-white/50 font-mono truncate">{product.code}</p>}
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-white/70">{stock} left</span>
                        <span className={`text-xs font-semibold ${profit >= 0 ? 'text-brand-gold' : 'text-red-400'}`}>
                          ₹{profit.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {reviewCount > 0 && (
                    <div className="absolute top-2 left-2 z-10 bg-brand-green text-brand-gold text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>★</span>
                      <span>{reviewCount}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setStockingProduct(product) }}
                      className="bg-white/90 hover:bg-white rounded-full p-1.5"
                      title="Add Stock"
                    >
                      <StockIcon />
                    </button>
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
      {stockingProduct && (
        <AddPurchaseModal
          productId={stockingProduct.id}
          onClose={() => setStockingProduct(null)}
          onAdded={fetchData}
        />
      )}
    </div>
  )
}
