import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddCouponModal from '../components/AddCouponModal'

function describe(c) {
  const off = c.discount_type === 'percent'
    ? `${Number(c.discount_value)}% off`
    : `₹${Number(c.discount_value)} off`
  const bits = []
  if (Number(c.min_order) > 0) bits.push(`min ₹${Number(c.min_order)}`)
  if (c.expiry_date) bits.push(`exp ${c.expiry_date}`)
  if (c.max_uses != null) bits.push(`${c.used_count}/${c.max_uses} used`)
  else if (c.used_count > 0) bits.push(`${c.used_count} used`)
  return { off, meta: bits.join(' · ') }
}

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchCoupons() {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCoupons() }, [])

  async function toggleActive(c) {
    await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id)
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  async function removeCoupon(id) {
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="lv-page max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h1 className="text-xl font-bold text-brand-green">Coupons</h1>
          <button onClick={() => setShowModal(true)} className="lv-btn px-4 py-2 text-sm font-semibold">
            + New Coupon
          </button>
        </div>
        <p className="text-gray-400 text-xs mb-6">Codes customers can enter at checkout for a discount.</p>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No coupons yet</p>
            <p className="text-gray-400 text-xs mb-5">Create a code customers can use at checkout</p>
            <button onClick={() => setShowModal(true)} className="lv-btn px-4 py-2 text-sm font-semibold">
              + New Coupon
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map(c => {
              const { off, meta } = describe(c)
              const expired = c.expiry_date && c.expiry_date < today
              return (
                <div key={c.id} className="lv-card px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800 tracking-wide">{c.code}</span>
                      <span className="text-xs text-brand-green font-semibold">{off}</span>
                      {!c.active && <span className="text-xs text-gray-400">· disabled</span>}
                      {expired && <span className="text-xs text-red-500">· expired</span>}
                    </div>
                    {meta && <p className="text-xs text-gray-400 mt-0.5 truncate">{meta}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className={`flex-shrink-0 text-xs font-medium ${c.active ? 'text-amber-600 hover:text-amber-700' : 'text-brand-green hover:opacity-80'}`}
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCoupon(c.id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-600 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <AddCouponModal onClose={() => setShowModal(false)} onAdded={fetchCoupons} />}
    </div>
  )
}
