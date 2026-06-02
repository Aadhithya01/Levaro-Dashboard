import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'

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
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <div className="bg-brand-green px-6 py-5 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-brand-gold tracking-[0.3em]">LEVARO</h1>
        <p className="text-brand-gold/50 text-[10px] tracking-[0.2em] uppercase mt-1">Timeless Style. Refined for You.</p>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <p className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-6">Our Collections</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-20">No collections available yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {categories.map(cat =>
              cat.image_url ? (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/shop/${cat.id}`)}
                  className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all ring-2 ring-transparent hover:ring-brand-green"
                >
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-bold text-white text-base tracking-wide">{cat.name}</p>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/shop/${cat.id}`)}
                  className="aspect-square rounded-2xl bg-white border border-brand-border flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:shadow-md transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-brand-gold">{cat.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <CustomerFooter />
      <FloatingFeedbackButton />
    </div>
  )
}
