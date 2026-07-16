import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddCouponModal({ onClose, onAdded }) {
  const [code, setCode] = useState('')
  const [type, setType] = useState('percent')
  const [value, setValue] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiry, setExpiry] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const normCode = code.trim().toUpperCase()
    if (!normCode) { setError('Enter a code'); return }
    const val = Number(value)
    if (Number.isNaN(val) || val <= 0) { setError('Enter a valid discount value'); return }
    if (type === 'percent' && val > 100) { setError('Percentage cannot exceed 100'); return }

    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('coupons').insert({
      code: normCode,
      discount_type: type,
      discount_value: val,
      min_order: minOrder === '' ? 0 : Number(minOrder),
      max_uses: maxUses === '' ? null : Number(maxUses),
      expiry_date: expiry || null,
      active,
    })
    if (err) {
      setError(err.code === '23505' ? 'A coupon with this code already exists' : err.message)
      setLoading(false)
      return
    }
    onAdded()
    onClose()
  }

  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">New Coupon</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Code</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20"
              className="w-full lv-input text-sm uppercase tracking-wide"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full lv-input text-sm">
                <option value="percent">% off</option>
                <option value="fixed">₹ off</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{type === 'percent' ? 'Percent' : 'Amount (₹)'}</label>
              <input
                type="number" min="0" step="1" value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'percent' ? '20' : '100'}
                className="w-full lv-input text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min order (₹)</label>
              <input
                type="number" min="0" step="1" value={minOrder}
                onChange={e => setMinOrder(e.target.value)} placeholder="0 (none)"
                className="w-full lv-input text-sm"
              />
            </div>
            <div>
              <label className={labelCls}>Max uses</label>
              <input
                type="number" min="1" step="1" value={maxUses}
                onChange={e => setMaxUses(e.target.value)} placeholder="unlimited"
                className="w-full lv-input text-sm"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Expiry date (optional)</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full lv-input text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active (usable at checkout)
          </label>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm lv-btn font-semibold disabled:opacity-40">
              {loading ? 'Saving…' : 'Add Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
