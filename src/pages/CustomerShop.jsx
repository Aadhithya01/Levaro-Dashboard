import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
import FloatingSuggestionButton from '../components/customer/FloatingSuggestionButton'
import Marquee from '../components/customer/Marquee'
import CursorAccent from '../components/customer/CursorAccent'
import { tileSpan, tileIndexLabel } from '../lib/collectionGrid'

// All usable image URLs for a category: product main images + product gallery
// images (images only, not video). Used so tiles/hero pull from real products.
function categoryImagePool(cat) {
  const urls = []
  ;(cat.products ?? []).forEach(p => {
    if (p.image_url) urls.push(p.image_url)
    ;(p.product_images ?? []).forEach(img => {
      if (img.media_url && (img.media_type === 'image' || !img.media_type)) urls.push(img.media_url)
    })
  })
  return urls
}

const pickRandom = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null)

export default function CustomerShop() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const navigate = useNavigate()
  const gridRef = useRef(null)
  const footerRef = useRef(null)

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, image_url, is_hero, products(id, image_url, product_images(media_url, media_type))')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setCategories(data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reveal tiles on scroll into view
  useEffect(() => {
    if (loading) return
    const tiles = gridRef.current?.querySelectorAll('[data-tile]') ?? []
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('levaro-rise'), i * 80)
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.15 })
    tiles.forEach(t => io.observe(t))
    return () => io.disconnect()
  }, [loading, categories])

  // Pick one random image per category (from its products), once per load so
  // it stays stable while scrolling but changes on each visit. Falls back to
  // the category's own image_url when it has no product images.
  const imageByCat = useMemo(() => {
    const map = {}
    categories.forEach(c => {
      map[c.id] = pickRandom(categoryImagePool(c)) || c.image_url || null
    })
    return map
  }, [categories])

  // Hero collection: admin-marked hero → newest collection that has an image →
  // first collection. Hero photo is a random product image from it, falling
  // back to any available image so the hero is never empty.
  const heroCat = useMemo(() =>
    categories.find(c => c.is_hero) ||
    [...categories].reverse().find(c => imageByCat[c.id]) ||
    categories[0] ||
    null
  , [categories, imageByCat])

  const heroImage = useMemo(() => {
    if (heroCat && imageByCat[heroCat.id]) return imageByCat[heroCat.id]
    return categories.map(c => imageByCat[c.id]).find(Boolean) || null
  }, [heroCat, imageByCat, categories])

  const scrollToCollections = () => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNav = (label) => {
    if (label === 'Contact') footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (label === 'About') setShowAbout(true)
    else scrollToCollections() // Collections, Lookbook
  }

  return (
    <div className="min-h-screen levaro-shop levaro-canvas">
      <CursorAccent />

      {/* ── Top bar ─────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 md:px-8 py-4 transition-colors duration-500"
        style={{
          backdropFilter: 'blur(6px)',
          background: scrolled
            ? 'rgba(12,44,33,0.92)'
            : 'linear-gradient(to bottom, rgba(12,44,33,0.75), transparent)',
        }}
      >
        <span className="levaro-display text-brand-gold" style={{ letterSpacing: '0.42em', fontSize: '1.05rem' }}>
          LEVARO
        </span>
        <nav className="hidden md:flex gap-7">
          {['Collections', 'About', 'Contact'].map(l => (
            <button
              key={l}
              onClick={() => handleNav(l)}
              className="text-brand-cream/60 hover:text-brand-gold transition-colors uppercase"
              style={{ fontSize: '0.62rem', letterSpacing: '0.28em' }}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>

      {/* Side rail */}
      <div
        className="hidden lg:block fixed left-3.5 top-1/2 z-20 uppercase text-brand-gold/40"
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)', fontSize: '0.55rem', letterSpacing: '0.5em' }}
      >
        Est. 2024 — Timeless Style
      </div>

      {/* ── Hero ────────────────────────────────── */}
      <section className="relative max-w-[1200px] mx-auto px-5 md:px-8 grid md:grid-cols-[1.15fr_0.85fr] items-center gap-8 pt-28 md:pt-24 md:min-h-screen">
        <div className="relative z-[5] order-2 md:order-1">
          <p
            className="uppercase text-brand-gold/55 mb-6 levaro-fade"
            style={{ fontSize: '0.6rem', letterSpacing: '0.55em' }}
          >
            The 2026 Atelier Collection
          </p>
          <h1
            className="levaro-display text-brand-cream"
            style={{ fontWeight: 300, lineHeight: 0.92, letterSpacing: '0.02em', fontSize: 'clamp(3.5rem, 12vw, 11rem)', whiteSpace: 'nowrap' }}
          >
            {'LEVARO'.split('').map((ch, i) => (
              <span key={i} className="levaro-letter" style={{ animationDelay: `${0.3 + i * 0.07}s` }}>{ch}</span>
            ))}
          </h1>
          <div className="flex items-center gap-4 mt-8 levaro-fade" style={{ animationDelay: '0.9s' }}>
            <span className="block w-14 h-px" style={{ background: 'linear-gradient(to right, #e8c96a, transparent)' }} />
            <p className="levaro-display text-brand-cream/80" style={{ fontStyle: 'italic', fontWeight: 300, fontSize: '1.35rem' }}>
              Timeless style, refined for you.
            </p>
          </div>
          <button
            onClick={scrollToCollections}
            data-hover
            className="group mt-10 inline-flex items-center gap-3.5 levaro-fade"
            style={{ animationDelay: '1.1s' }}
          >
            <span className="uppercase text-brand-gold" style={{ fontSize: '0.65rem', letterSpacing: '0.3em' }}>
              Explore the collections
            </span>
            <span className="w-12 h-12 rounded-full grid place-items-center text-brand-gold transition-all duration-500 group-hover:bg-brand-gold group-hover:text-brand-green group-hover:translate-x-1.5"
              style={{ border: '1px solid rgba(232,201,106,0.4)' }}>
              ↓
            </span>
          </button>
        </div>

        {/* Hero art */}
        <div className="order-1 md:order-2 relative h-[42vh] md:h-[78vh] rounded-sm overflow-hidden levaro-reveal"
          style={{ background: 'linear-gradient(160deg, #3a6a55, #16402f)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>
          {heroImage && (
            <img src={heroImage} alt={heroCat?.name ?? 'LEVARO'} className="w-full h-full object-cover levaro-zoom" style={{ opacity: 0.92 }} />
          )}
          <div className="absolute inset-3.5 pointer-events-none z-[3]" style={{ border: '1px solid rgba(232,201,106,0.35)' }} />
          <span className="absolute right-5 top-4 z-[4] levaro-display text-brand-gold" style={{ fontSize: '0.8rem', letterSpacing: '0.3em' }}>N° 01</span>
          {heroCat && (
            <span className="absolute left-6 bottom-6 z-[4] levaro-display text-white" style={{ fontStyle: 'italic', fontSize: '1.1rem', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {heroCat.name}
            </span>
          )}
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────── */}
      <div className="mt-4 md:mt-2 relative z-[3]">
        <Marquee />
      </div>

      {/* ── Collections ─────────────────────────── */}
      <main ref={gridRef} className="max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-10 md:mb-14">
          <h2 className="levaro-display text-brand-cream" style={{ fontWeight: 300, lineHeight: 1, fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
            Our <em className="text-brand-gold" style={{ fontStyle: 'italic' }}>Collections</em>
          </h2>
          <div className="uppercase text-brand-cream/45 md:text-right" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', lineHeight: 2 }}>
            Curated seasonal edits<br />
            {categories.length} {categories.length === 1 ? 'distinct line' : 'distinct lines'}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-5 h-5 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-brand-cream/40 text-center py-24 levaro-display" style={{ fontStyle: 'italic', fontSize: '1.1rem' }}>
            No collections available yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 auto-rows-[120px] md:auto-rows-[140px] gap-3 md:gap-4">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                data-tile
                data-hover
                onClick={() => navigate(`/shop/${cat.id}`)}
                className={`group relative overflow-hidden rounded-sm cursor-pointer opacity-0 ${tileSpan(i)}`}
                style={{ background: 'linear-gradient(160deg, #2f5f4c, #173f2f)' }}
              >
                {imageByCat[cat.id] ? (
                  <img
                    src={imageByCat[cat.id]}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                    style={{ opacity: 0.9 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="levaro-display text-brand-gold/25" style={{ fontSize: '3rem', fontWeight: 300 }}>
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* gradient overlay */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,30,22,0.82) 0%, rgba(8,30,22,0.05) 55%)' }} />
                {/* gold ring on hover */}
                <div className="absolute inset-3 pointer-events-none transition-colors duration-400 border border-transparent group-hover:border-brand-gold/55" />
                {/* index */}
                <span className="absolute top-3.5 left-4 z-[3] levaro-display text-brand-gold" style={{ fontSize: '0.85rem', letterSpacing: '0.2em' }}>
                  {tileIndexLabel(i)}
                </span>
                {/* info */}
                <div className="absolute left-4 right-4 bottom-4 z-[3]">
                  <h3 className="levaro-display text-white leading-tight" style={{ fontWeight: 400, fontSize: i % 5 === 0 ? '1.7rem' : '1.35rem' }}>
                    {cat.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1.5">
                    {cat.products?.length > 0 && (
                      <span className="uppercase text-white/55" style={{ fontSize: '0.58rem', letterSpacing: '0.18em' }}>
                        {cat.products.length} {cat.products.length === 1 ? 'piece' : 'pieces'}
                      </span>
                    )}
                    <span className="uppercase text-brand-gold ml-auto opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400"
                      style={{ fontSize: '0.58rem', letterSpacing: '0.3em' }}>
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div ref={footerRef}>
        <CustomerFooter />
      </div>
      <FloatingFeedbackButton />
      <FloatingSuggestionButton />

      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 levaro-shop"
          style={{ background: 'rgba(8,30,22,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAbout(false)}
        >
          <div
            className="levaro-card-enter bg-brand-cream rounded-2xl w-full max-w-sm px-8 py-9 text-center"
            style={{ boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.6rem', lineHeight: 1 }}>🧵✂️</div>
            <h3 className="levaro-display text-brand-green mt-3" style={{ fontSize: '1.7rem', fontWeight: 500, letterSpacing: '0.02em' }}>
              Under Construction
            </h3>
            <p className="text-gray-600 mt-3" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Our finest tailors are still stitching this page together —
              needle, thread, and a little drama. Our story will be worth the
              wait. Do come back soon. ✦
            </p>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-6 bg-brand-green text-brand-gold rounded-full px-6 py-2.5 hover:opacity-90 transition-opacity uppercase"
              style={{ fontSize: '0.65rem', letterSpacing: '0.22em', fontWeight: 600 }}
            >
              Back to the Collection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
