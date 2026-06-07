import { useState } from 'react'

export default function ImageZoomModal({ items = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  if (!items.length) return null

  const item = items[index]

  function go(newIndex) {
    setIndex(newIndex)
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/50 text-sm">{index + 1} / {items.length}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(+(z - 0.5).toFixed(1), 1))}
            disabled={zoom <= 1}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 text-white text-xl flex items-center justify-center transition-colors"
            aria-label="Zoom out"
          >−</button>
          <span className="text-white/70 text-xs w-8 text-center">{zoom}×</span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(+(z + 0.5).toFixed(1), 4))}
            disabled={zoom >= 4}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 text-white text-xl flex items-center justify-center transition-colors"
            aria-label="Zoom in"
          >+</button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >✕</button>
      </div>

      {/* Media */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        onDoubleClick={() => setZoom(z => z > 1 ? 1 : 2)}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}>
          {item.type === 'video' ? (
            <video
              src={item.url}
              autoPlay muted loop playsInline
              className="max-w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 130px)' }}
            />
          ) : (
            <img
              src={item.url}
              alt=""
              draggable={false}
              className="max-w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 130px)' }}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => go(Math.max(index - 1, 0))}
            disabled={index === 0}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Previous"
          >‹</button>
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(Math.min(index + 1, items.length - 1))}
            disabled={index === items.length - 1}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Next"
          >›</button>
        </div>
      )}
    </div>
  )
}
