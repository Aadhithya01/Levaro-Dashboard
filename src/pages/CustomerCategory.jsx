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
      try {
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
      } finally {
        setLoading(false)
      }
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
                  onClick={() => setViewingProduct({ product, allMedia, soldOut })}
                  className="rounded-2xl overflow-hidden bg-white border border-brand-border shadow-sm transition-all hover:border-brand-green hover:shadow-md cursor-pointer"
                >
                  <div className={`relative aspect-square ${soldOut ? 'opacity-60' : ''}`}>
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
