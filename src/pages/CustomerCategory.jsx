import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
import FloatingSuggestionButton from '../components/customer/FloatingSuggestionButton'
import ReviewModal from '../components/customer/ReviewModal'
import MediaSlider from '../components/MediaSlider'
import ProductMediaModal from '../components/customer/ProductMediaModal'
import Marquee from '../components/customer/Marquee'
import CursorAccent from '../components/customer/CursorAccent'

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
    <div className="min-h-screen levaro-shop levaro-canvas flex flex-col">
      <CursorAccent />

      {/* ── Top bar ─────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-8 py-4"
        style={{ backdropFilter: 'blur(6px)', background: 'rgba(12,44,33,0.9)', borderBottom: '1px solid rgba(232,201,106,0.14)' }}
      >
        <button
          onClick={() => navigate('/shop')}
          data-hover
          className="flex items-center gap-1.5 text-brand-gold/60 hover:text-brand-gold transition-colors"
        >
          <span>←</span>
          <span className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.28em' }}>Collections</span>
        </button>
        <span className="levaro-display text-brand-gold" style={{ fontSize: '1.05rem', fontWeight: 300, letterSpacing: '0.4em' }}>
          LEVARO
        </span>
        <div className="w-24" />
      </header>

      <Marquee />

      {/* ── Products ────────────────────────────── */}
      <main className="max-w-[1200px] w-full mx-auto px-5 md:px-8 py-12 md:py-16 flex-1 relative z-[3]">

        {/* Category heading */}
        <div className="flex flex-col items-center mb-10 md:mb-14 levaro-fade gap-2">
          <div className="flex items-center gap-4 w-full max-w-2xl">
            <span className="flex-1 h-px bg-brand-gold/20" />
            <p className="levaro-display text-brand-gold uppercase text-center" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.4rem)', letterSpacing: '0.18em', fontWeight: 300 }}>
              {category?.name ?? ''}
            </p>
            <span className="flex-1 h-px bg-brand-gold/20" />
          </div>
          {!loading && products.length > 0 && (
            <p className="levaro-display text-brand-cream/45" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
              {products.length} {products.length === 1 ? 'piece' : 'pieces'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-5 h-5 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <p className="levaro-display text-brand-cream/40 text-center py-24" style={{ fontStyle: 'italic', fontSize: '1.1rem' }}>
            No pieces in this collection yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, i) => {
              const totalQty = (product.purchases ?? []).reduce((sum, p) => sum + p.quantity, 0)
              const soldQty = (product.sales ?? []).reduce((sum, s) => sum + s.quantity_sold, 0)
              const stockLeft = totalQty - soldQty
              const soldOut = stockLeft <= 0
              const reviewRatings = product.product_reviews ?? []
              const reviewCount = reviewRatings.length
              const avgRating = reviewCount > 0
                ? (reviewRatings.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1)
                : null
              const allMedia = buildMedia(product)

              return (
                <div
                  key={product.id}
                  data-hover
                  onClick={() => setViewingProduct({ product, allMedia, soldOut })}
                  className="levaro-card-enter group bg-brand-cream rounded-sm overflow-hidden cursor-pointer transition-transform duration-500 hover:-translate-y-1.5"
                  style={{ animationDelay: `${i * 0.05}s`, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
                >
                  {/* Image */}
                  <div className={`relative overflow-hidden ${soldOut ? 'opacity-60' : ''}`} style={{ aspectRatio: '0.82' }}>
                    {allMedia.length > 0 ? (
                      <MediaSlider items={allMedia} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #d9c9b0, #b89c7e)' }}>
                        <span className="levaro-display text-brand-green/30" style={{ fontSize: '3.5rem', fontWeight: 300 }}>
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!soldOut && stockLeft > 0 && stockLeft <= 3 && (
                      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                        <span className="text-white font-semibold uppercase rounded-full px-2.5 py-0.5" style={{ background: '#d4a853', fontSize: '0.55rem', letterSpacing: '0.12em' }}>
                          Only {stockLeft} left
                        </span>
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                        <span className="bg-black/60 text-white uppercase px-4 py-1.5 rounded-full" style={{ fontSize: '0.6rem', letterSpacing: '0.35em' }}>
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3.5 pt-3 pb-4">
                    <h4 className="levaro-display text-gray-800 truncate leading-snug" style={{ fontSize: '1.2rem', fontWeight: 500, letterSpacing: '0.01em' }}>
                      {product.name}
                    </h4>
                    <p className="mt-0.5 font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.95rem', color: '#1a5c45' }}>
                      {product.selling_price != null
                        ? `₹${Number(product.selling_price).toFixed(0)}`
                        : <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8rem' }}>Price on request</span>}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      {avgRating ? (
                        <span className="flex items-center gap-1">
                          <span className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                              <svg key={s} className="w-2.5 h-2.5" viewBox="0 0 20 20" fill={s <= Math.round(parseFloat(avgRating)) ? '#d4a853' : '#e5e7eb'}>
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </span>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.65rem' }}>{avgRating}</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.62rem' }}>({reviewCount})</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>No reviews</span>
                      )}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setReviewingProduct({ id: product.id, name: product.name }) }}
                        className="border border-brand-green/50 text-brand-green rounded-md px-2.5 py-1 hover:bg-brand-green hover:text-brand-gold transition-all duration-200"
                        style={{ fontSize: '0.62rem', letterSpacing: '0.05em', fontWeight: 600 }}
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
