import MediaSlider from '../MediaSlider'

export default function ProductMediaModal({ product, allMedia = [], soldOut, onClose, onReview }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-black">
          {allMedia.length > 0 ? (
            <MediaSlider items={allMedia} alwaysShowArrows objectFit="contain" />
          ) : (
            <div className="w-full h-full bg-brand-green/20 flex items-center justify-center">
              <span className="text-7xl font-bold text-brand-green/30">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70 z-30"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="font-bold text-gray-900 text-lg leading-tight">{product.name}</p>
          <p className="text-brand-green font-bold text-xl mt-1">
            {product.selling_price != null
              ? `₹${Number(product.selling_price).toFixed(0)}`
              : <span className="text-gray-400 font-normal text-base">Price on request</span>
            }
          </p>
          {soldOut && (
            <p className="text-red-500 text-sm font-semibold mt-1">Sold Out</p>
          )}
          <button
            type="button"
            onClick={() => onReview(product)}
            className="mt-4 w-full border border-brand-green text-brand-green rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-green/5 transition-colors"
          >
            ★ Write a Review
          </button>
        </div>
      </div>
    </div>
  )
}
