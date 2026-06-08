import { useState } from 'react'
import MediaSlider from '../MediaSlider'
import ImageZoomModal from '../ImageZoomModal'

const ZoomIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 8v6M8 11h6" />
  </svg>
)

export default function ProductMediaModal({ product, allMedia = [], soldOut, onClose, onReview }) {
  const [zoomOpen, setZoomOpen] = useState(false)

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
          {/* Image */}
          <div className="relative aspect-square bg-black">
            {allMedia.length > 0 ? (
              <MediaSlider items={allMedia} alwaysShowArrows objectFit="contain" />
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
            {allMedia.length > 0 && (
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

            <p
              className="mt-1.5 font-semibold"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '1.15rem', color: '#1a5c45' }}
            >
              {product.selling_price != null
                ? `₹${Number(product.selling_price).toFixed(0)}`
                : <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.9rem' }}>Price on request</span>
              }
            </p>

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
              onClick={() => onReview(product)}
              className="mt-4 w-full border border-brand-green/40 text-brand-green rounded-xl py-2.5 hover:bg-brand-green hover:text-brand-gold transition-all duration-250 font-semibold"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem', letterSpacing: '0.12em' }}
            >
              ★ WRITE A REVIEW
            </button>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <ImageZoomModal items={allMedia} onClose={() => setZoomOpen(false)} />
      )}
    </>
  )
}
