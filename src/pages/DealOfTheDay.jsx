import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddDealModal from '../components/AddDealModal'
import { todayISO } from '../lib/deals'

export default function DealOfTheDay() {
  const [date, setDate] = useState(todayISO())
  const [deals, setDeals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchDeals(d) {
    const { data } = await supabase
      .from('deal_products')
      .select('id, deal_price, deal_date, product:products(id, name, code, selling_price)')
      .eq('deal_date', d)
      .order('created_at', { ascending: true })
    setDeals(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('products').select('id, name, code, selling_price').order('name')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  useEffect(() => { fetchDeals(date) }, [date])

  async function removeDeal(id) {
    await supabase.from('deal_products').delete().eq('id', id)
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  const existingIds = deals.map(d => d.product?.id).filter(Boolean)
  const isToday = date === todayISO()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="lv-page max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h1 className="text-xl font-bold text-brand-green">Deal of the Day</h1>
          <button onClick={() => setShowModal(true)} className="lv-btn px-4 py-2 text-sm font-semibold">
            + Add Deal
          </button>
        </div>
        <p className="text-gray-400 text-xs mb-6">
          Products listed here sell at their deal price on the selected date
          {isToday ? ' — today is live on the shop right now' : ''}. Deals auto-expire at midnight.
        </p>

        <div className="flex items-center gap-2 mb-6">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="lv-input text-sm"
          />
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No deals for this date</p>
            <p className="text-gray-400 text-xs mb-5">Feature a few products at a special low price for the day</p>
            <button onClick={() => setShowModal(true)} className="lv-btn px-4 py-2 text-sm font-semibold">
              + Add Deal
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {deals.map(d => {
              const sp = d.product?.selling_price != null ? Number(d.product.selling_price) : null
              const dp = Number(d.deal_price)
              const pct = sp && sp > 0 ? Math.round(((sp - dp) / sp) * 100) : null
              return (
                <div key={d.id} className="lv-card px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {d.product?.name ?? 'Unknown product'}
                      {d.product?.code && <span className="text-gray-400 font-normal"> · {d.product.code}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      {sp != null && <span className="text-gray-400 line-through">₹{sp.toFixed(0)}</span>}
                      <span className="text-brand-green font-semibold">₹{dp.toFixed(0)}</span>
                      {pct != null && <span className="text-amber-600 font-semibold">{pct}% off</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeal(d.id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-600 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddDealModal
          date={date}
          products={products.filter(p => p.selling_price != null && !existingIds.includes(p.id))}
          onClose={() => setShowModal(false)}
          onAdded={() => fetchDeals(date)}
        />
      )}
    </div>
  )
}
