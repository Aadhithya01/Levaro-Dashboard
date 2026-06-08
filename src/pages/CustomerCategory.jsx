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
    <div className="min-h-screen bg-brand-cream flex flex-col levaro-shop">

      {/* ── Header ─────────────────────────────── */}
      <header className="bg-brand-green relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #e8c96a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/shop')}
            className="text-brand-gold/60 hover:text-brand-gold transition-colors flex items-center gap-1.5"
            style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}
          >
            <span>←</span>
            <span className="uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Collections</span>
          </button>
          <span
            className="levaro-display text-brand-gold"
            style={{ fontSize: '1.3rem', fontWeight: 300, letterSpacing: '0.4em' }}
          >
            LEVARO
          </span>
          <div className="w-24" />
        </div>
      </header>

      {/* ── Products ───────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1">

        {/* Category heading */}
        <div className="flex items-center gap-4 mb-8 levaro-fade">
          <span className="flex-1 h-px bg-brand-border" />
          <p
            className="levaro-display text-brand-green uppercase"
            style={{ fontSize: '0.7rem', letterSpacing: '0.45em', fontWeight: 500 }}
          >
            {category?.name ?? ''}
          </p>
          <span className="flex-1 h-px bg-brand-border" />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-5 h-5 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <p
            className="levaro-display text-gray-400 text-center py-24"
            style={{ fontStyle: 'italic', fontSize: '1.1rem' }}
          >
            No pieces in this collection yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {products.map((product, i) => {
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
                  className="levaro-card-enter bg-white rounded-2xl overflow-hidden cursor-pointer group border border-brand-border/60 hover:border-brand-green/30 hover:shadow-xl transition-all duration-400"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {/* Image */}
                  <div className={`relative aspect-square ${soldOut ? 'opacity-55' : ''}`}>
                    {allMedia.length > 0 ? (
                      <MediaSlider items={allMedia} />
                    ) : (
                      <div className="w-full h-full bg-brand-green/5 flex items-center justify-center">
                        <span
                          className="levaro-display text-brand-green/20"
                          style={{ fontSize: '3.5rem', fontWeight: 300 }}
                        >
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                        <span
                          className="bg-black/60 text-white uppercase px-4 py-1.5 rounded-full"
                          style={{ fontSize: '0.6rem', letterSpacing: '0.35em' }}
                        >
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3.5 pt-3 pb-3.5">
                    <p
                      className="levaro-display text-gray-800 truncate leading-snug"
                      style={{ fontSize: '1.05rem', fontWeight: 400, letterSpacing: '0.02em' }}
                    >
                      {product.name}
                    </p>

                    <p
                      className="mt-1 font-semibold"
                      style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.95rem', color: '#1a5c45' }}
                    >
                      {product.selling_price != null
                        ? `₹${Number(product.selling_price).toFixed(0)}`
                        : <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8rem' }}>Price on request</span>
                      }
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      {avgRating ? (
                        <span className="flex items-center gap-1" style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          <span style={{ color: '#e8c96a' }}>★</span>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{avgRating}</span>
                          <span style={{ color: '#9ca3af' }}>({reviewCount})</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#d1d5db' }}>No reviews</span>
                      )}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setReviewingProduct({ id: product.id, name: product.name }) }}
                        className="border border-brand-green/50 text-brand-green rounded-lg px-2.5 py-1 hover:bg-brand-green hover:text-brand-gold transition-all duration-200"
                        style={{ fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600 }}
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
      </main>

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
