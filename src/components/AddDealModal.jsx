import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddDealModal({ date, categories = [], products = [], existingIds = [], onClose, onAdded }) {
  const [categoryId, setCategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [dealPrice, setDealPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const catProducts = products.filter(
    p => p.category_id === categoryId && p.selling_price != null && !existingIds.includes(p.id)
  )
  const selected = products.find(p => p.id === productId)
  const sp = selected?.selling_price != null ? Number(selected.selling_price) : null
  const dp = dealPrice === '' ? null : Number(dealPrice)
  const pct = sp && sp > 0 && dp != null && dp >= 0 && dp < sp
    ? Math.round(((sp - dp) / sp) * 100)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!productId) { setError('Pick a product'); return }
    if (dp == null || Number.isNaN(dp) || dp < 0) { setError('Enter a valid deal price'); return }
    if (sp != null && dp >= sp) { setError('Deal price must be below the normal price'); return }

    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('deal_products').insert({
      product_id: productId,
      deal_price: dp,
      deal_date: date,
    })
    if (err) {
      setError(err.code === '23505' ? 'That product already has a deal on this date' : err.message)
      setLoading(false)
      return
    }
    onAdded()
    onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Add Deal</h2>
        <p className="text-xs text-gray-400 mb-4">For {date}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setProductId('') }}
              className="w-full lv-input text-sm"
            >
              <option value="">Select a category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              disabled={!categoryId}
              className="w-full lv-input text-sm disabled:opacity-50"
            >
              <option value="">{categoryId ? 'Select a product…' : 'Pick a category first'}</option>
              {catProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ''} — ₹{Number(p.selling_price).toFixed(0)}
                </option>
              ))}
            </select>
            {categoryId && catProducts.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">
                No eligible products here — each needs a price and can't already be on deal for this date.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deal price (₹)</label>
            <input
              type="number" min="0" step="1" value={dealPrice}
              onChange={e => setDealPrice(e.target.value)} placeholder="e.g. 199"
              className="w-full lv-input text-sm"
            />
            {sp != null && (
              <p className="text-xs mt-1 text-gray-500">
                Normal ₹{sp.toFixed(0)}
                {pct != null && <span className="text-amber-600 font-semibold"> · {pct}% off</span>}
              </p>
            )}
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm lv-btn font-semibold disabled:opacity-40">
              {loading ? 'Adding…' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
