import { useState, useRef, useEffect } from 'react'

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  )
}

export default function MediaSlider({ items, className = '', alwaysShowArrows = false, objectFit = 'cover' }) {
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

  const imgClass = `w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`
  const videoClass = `w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`

  const arrowBase = 'absolute top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full p-1.5 z-20 transition-all duration-200'
  const arrowShow = alwaysShowArrows
    ? 'opacity-100'
    : 'opacity-0 group-hover/slider:opacity-100'

  return (
    <div
      className={`relative overflow-hidden w-full h-full group/slider ${className}`}
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
                <video src={item.url} autoPlay muted loop playsInline className={videoClass} />
              ) : (
                <div className="w-full h-full bg-black" />
              )
            ) : (
              <img src={item.url} alt="" className={imgClass} />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Previous"
              onClick={e => { e.stopPropagation(); setIndex(i => Math.max(i - 1, 0)) }}
              className={`${arrowBase} left-2 ${arrowShow}`}
            >
              <ChevronLeft />
            </button>
          )}
          {index < items.length - 1 && (
            <button
              type="button"
              aria-label="Next"
              onClick={e => { e.stopPropagation(); setIndex(i => Math.min(i + 1, items.length - 1)) }}
              className={`${arrowBase} right-2 ${arrowShow}`}
            >
              <ChevronRight />
            </button>
          )}
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
        </>
      )}
    </div>
  )
}
