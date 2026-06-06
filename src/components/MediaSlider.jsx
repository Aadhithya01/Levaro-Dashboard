import { useState, useRef, useEffect } from 'react'

export default function MediaSlider({ items, className = '' }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)
  useEffect(() => { setIndex(0) }, [items])

  if (!items || items.length === 0) return null

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -40) setIndex(i => Math.min(i + 1, items.length - 1))
    else if (dx > 40) setIndex(i => Math.max(i - 1, 0))
  }

  return (
    <div
      className={`relative overflow-hidden w-full h-full ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={item.url} className="shrink-0 w-full h-full">
            {item.type === 'video' ? (
              i === index ? (
                <video
                  src={item.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black" />
              )
            ) : (
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={e => { e.stopPropagation(); setIndex(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-all pointer-events-auto ${
                i === index ? 'bg-white scale-110' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
