import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
import FloatingSuggestionButton from '../components/customer/FloatingSuggestionButton'

export default function CustomerShop() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, image_url')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setCategories(data ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-brand-cream levaro-shop">

      {/* ── Header ─────────────────────────────── */}
      <header className="bg-brand-green relative overflow-hidden">
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #e8c96a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative px-6 py-10 text-center levaro-fade" style={{ animationDelay: '0.05s' }}>
          <p className="text-brand-gold/40 text-[9px] tracking-[0.55em] uppercase mb-4">Est. 2024</p>
          <h1
            className="levaro-display text-brand-gold"
            style={{ fontSize: '2.6rem', fontWeight: 300, letterSpacing: '0.45em', lineHeight: 1 }}
          >
            LEVARO
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="block w-10 h-px bg-brand-gold/30" />
            <p
              className="levaro-display text-brand-gold/55 tracking-wide"
              style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300 }}
            >
              Timeless Style. Refined for You.
            </p>
            <span className="block w-10 h-px bg-brand-gold/30" />
          </div>
        </div>
      </header>

      {/* ── Collections ───────────────────────── */}
      <main className="max-w-5xl w-full mx-auto px-6 py-10">

        {/* Section rule */}
        <div className="flex items-center gap-4 mb-8">
          <span className="flex-1 h-px bg-brand-border" />
          <p
            className="levaro-display text-brand-green/70 uppercase"
            style={{ fontSize: '0.7rem', letterSpacing: '0.45em', fontWeight: 500 }}
          >
            Our Collections
          </p>
          <span className="flex-1 h-px bg-brand-border" />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-5 h-5 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-24 levaro-display" style={{ fontStyle: 'italic' }}>
            No collections available yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {categories.map((cat, i) =>
              cat.image_url ? (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/shop/${cat.id}`)}
                  className="levaro-card-enter relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                  {/* Gold ring on hover */}
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-brand-gold/50 transition-all duration-400" />
                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p
                      className="levaro-display text-white leading-tight"
                      style={{ fontSize: '1.25rem', fontWeight: 400, letterSpacing: '0.06em' }}
                    >
                      {cat.name}
                    </p>
                    <p
                      className="text-brand-gold/70 uppercase mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1"
                      style={{ fontSize: '0.6rem', letterSpacing: '0.3em' }}
                    >
                      Explore <span>→</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/shop/${cat.id}`)}
                  className="levaro-card-enter aspect-square rounded-2xl border border-brand-border bg-white flex flex-col items-center justify-center cursor-pointer group hover:border-brand-green/50 hover:shadow-lg transition-all duration-400"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="w-14 h-14 rounded-full bg-brand-green/8 flex items-center justify-center mb-3 group-hover:bg-brand-green/15 transition-colors duration-300">
                    <span
                      className="levaro-display text-brand-green"
                      style={{ fontSize: '1.75rem', fontWeight: 300 }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p
                    className="levaro-display text-brand-green text-center px-3"
                    style={{ fontSize: '1rem', fontWeight: 400, letterSpacing: '0.04em' }}
                  >
                    {cat.name}
                  </p>
                  <p
                    className="text-gray-400 uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ fontSize: '0.6rem', letterSpacing: '0.3em' }}
                  >
                    Explore
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </main>

      <CustomerFooter />
      <FloatingFeedbackButton />
      <FloatingSuggestionButton />
    </div>
  )
}
