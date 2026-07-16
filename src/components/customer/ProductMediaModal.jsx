import { useState } from 'react'
import MediaSlider from '../MediaSlider'
import ImageZoomModal from '../ImageZoomModal'
import { useCart } from '../../contexts/CartContext'
import PriceTag from './PriceTag'

const ZoomIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 8v6M8 11h6" />
  </svg>
)

export default function ProductMediaModal({ product, allMedia = [], soldOut, variants = [], dealPrice = null, onClose, onReview }) {
  const [zoomOpen, setZoomOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const { addItem } = useCart()
  const hasVariants = variants.length > 0
  const displayMedia = selectedVariant?.image_url
    ? [{ url: selectedVariant.image_url, type: 'image' }]
    : allMedia
  const canAdd = product.selling_price != null && (
    hasVariants ? (selectedVariant && selectedVariant.stock > 0) : !soldOut
  )
  const cartImage = selectedVariant?.image_url ?? allMedia[0]?.url ?? product.image_url ?? null
  const cartPrice = dealPrice != null && product.selling_price != null && Number(dealPrice) < Number(product.selling_price)
    ? Number(dealPrice)
    : product.selling_price

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      code: product.code,
      price: cartPrice,
      image: cartImage,
      ...(selectedVariant && { color: selectedVariant.color_name, variantId: selectedVariant.id }),
    })
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-5 levaro-shop"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="levaro-card-enter w-full max-w-sm bg-white overflow-hidden shadow-2xl"
          style={{ borderRadius: '20px', animationDelay: '0s' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Image — double-click anywhere on it to zoom */}
          <div
            className="relative aspect-square bg-black"
            onDoubleClick={() => displayMedia.length > 0 && setZoomOpen(true)}
            style={{ cursor: displayMedia.length > 0 ? 'zoom-in' : 'default' }}
          >
            {displayMedia.length > 0 ? (
              <MediaSlider items={displayMedia} alwaysShowArrows objectFit="contain" />
            ) : (
              <div className="w-full h-full bg-brand-green/10 flex items-center justify-center">
                <span
                  className="levaro-display text-brand-green/25"
                  style={{ fontSize: '5rem', fontWeight: 300 }}
                >
                  {product.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/60 z-30 transition-colors"
              style={{ fontSize: '0.85rem' }}
            >✕</button>

            {/* Zoom */}
            {displayMedia.length > 0 && (
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Zoom"
                className="absolute top-3 left-3 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/60 z-30 transition-colors"
              >
                <ZoomIcon />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-5">
            {/* Gold rule */}
            <div className="w-8 h-px bg-brand-gold mb-3" />

            <p
              className="levaro-display text-gray-900 leading-tight"
              style={{ fontSize: '1.35rem', fontWeight: 400, letterSpacing: '0.02em' }}
            >
              {product.name}
            </p>

            {product.code && (
              <p
                className="mt-1"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 500 }}
              >
                {product.code}
              </p>
            )}

            <div className="mt-1.5">
              <PriceTag product={product} size="lg" dealPrice={dealPrice} />
            </div>

            {product.description && (
              <p
                className="mt-3 text-gray-600 whitespace-pre-line"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.85rem', lineHeight: 1.6 }}
              >
                {product.description}
              </p>
            )}

            {hasVariants && (
              <div className="mt-3">
                <p className="uppercase text-gray-500 mb-1.5" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.6rem', letterSpacing: '0.18em' }}>
                  Colour {selectedVariant ? `· ${selectedVariant.color_name}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => {
                    const out = v.stock <= 0
                    const active = selectedVariant?.id === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={out}
                        onClick={() => setSelectedVariant(v)}
                        title={out ? `${v.color_name} — sold out` : v.color_name}
                        className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${active ? 'border-brand-green' : 'border-transparent'} ${out ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-green/50'}`}
                      >
                        {v.image_url
                          ? <img src={v.image_url} alt={v.color_name} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-[9px] text-gray-500">{v.color_name}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {soldOut && (
              <p
                className="mt-1 uppercase text-red-500"
                style={{ fontSize: '0.65rem', letterSpacing: '0.3em', fontWeight: 600 }}
              >
                Sold Out
              </p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="mt-4 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.78rem', letterSpacing: '0.12em' }}
            >
              {soldOut ? 'SOLD OUT'
                : product.selling_price == null ? 'PRICE ON REQUEST'
                : hasVariants && !selectedVariant ? 'SELECT A COLOUR'
                : 'ADD TO CART'}
            </button>

            <button
              type="button"
              onClick={() => onReview(product)}
              className="mt-2 w-full border border-brand-green/40 text-brand-green rounded-xl py-2.5 hover:bg-brand-green hover:text-brand-gold transition-all duration-250 font-semibold"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem', letterSpacing: '0.12em' }}
            >
              ★ WRITE A REVIEW
            </button>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <ImageZoomModal items={displayMedia} onClose={() => setZoomOpen(false)} />
      )}
    </>
  )
}
