import { useEffect, useRef, useState } from 'react'

// Gold dot cursor that follows the pointer and swells over [data-hover]
// elements. No-op on touch / non-hover devices.
export default function CursorAccent() {
  const dotRef = useRef(null)
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  )
  const [big, setBig] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const dot = dotRef.current
    const move = e => {
      if (dot) {
        dot.style.left = `${e.clientX}px`
        dot.style.top = `${e.clientY}px`
      }
    }
    const over = e => setBig(!!e.target.closest('[data-hover]'))

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[999] rounded-full bg-brand-gold -translate-x-1/2 -translate-y-1/2 hidden md:block"
      style={{
        width: big ? 42 : 8,
        height: big ? 42 : 8,
        opacity: big ? 0.25 : 1,
        mixBlendMode: 'difference',
        transition: 'width .25s, height .25s, opacity .25s',
      }}
    />
  )
}
