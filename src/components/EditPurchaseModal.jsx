import { useState } from 'react'
import { supabase } from '../lib/supabase'

const UNCOLOURED = '__uncoloured__'

export default function EditPurchaseModal({ purchase, variants = [], onClose, onUpdated }) {
  const hasVariants = variants.length > 0
  const originalQty = purchase.quantity

  const [price, setPrice] = useState(String(purchase.price_per_piece))
  const [date, setDate] = useState(purchase.date_of_purchase)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // No-variant products keep the simple single-quantity field.
  const [quantity, setQuantity] = useState(String(purchase.quantity))

  // Variant products allocate this entry's quantity across colours (+ Uncoloured).
  // Prefill the row's current colour with the full quantity; the rest start empty.
  const [alloc, setAlloc] = useState(() => {
    const init = {}
    variants.forEach(v => { init[v.id] = '' })
    init[UNCOLOURED] = ''
    init[purchase.variant_id ?? UNCOLOURED] = String(originalQty)
    return init
  })
  function setAllocValue(key, value) {
    setAlloc(a => ({ ...a, [key]: value }))
  }

  const splitTotal = Object.values(alloc).reduce((s, val) => s + (parseInt(val) || 0), 0)
  const splitMatches = splitTotal === originalQty

  async function handleSubmit(e) {
    e.preventDefault()
    const ppp = parseFloat(price)
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (!date) { setError('Select a date'); return }

    if (!hasVariants) {
      const qty = parseInt(quantity)
      if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
      setLoading(true)
      const { error: err } = await supabase.from('purchases').update({
        date_of_purchase: date, quantity: qty, price_per_piece: ppp, variant_id: null,
      }).eq('id', purchase.id)
      setLoading(false)
      if (err) { setError(err.message); return }
      onUpdated(); onClose(); return
    }

    // Build the per-colour allocations (skip zeros).
    const entries = []
    for (const v of variants) {
      const q = parseInt(alloc[v.id]) || 0
      if (q > 0) entries.push({ variant_id: v.id, quantity: q })
    }
    const uq = parseInt(alloc[UNCOLOURED]) || 0
    if (uq > 0) entries.push({ variant_id: null, quantity: uq })

    if (entries.length === 0) { setError('Enter at least one quantity'); return }
    if (splitTotal !== originalQty) {
      setError(`Colour quantities must add up to ${originalQty}`); return
    }

    setLoading(true)
    // Reuse the original row for the first allocation, insert new rows for the rest.
    const [first, ...rest] = entries
    const { error: updErr } = await supabase.from('purchases').update({
      date_of_purchase: date,
      quantity: first.quantity,
      price_per_piece: ppp,
      variant_id: first.variant_id,
    }).eq('id', purchase.id)
    if (updErr) { setLoading(false); setError(updErr.message); return }

    if (rest.length) {
      const rows = rest.map(r => ({
        product_id: purchase.product_id,
        date_of_purchase: date,
        price_per_piece: ppp,
        quantity: r.quantity,
        variant_id: r.variant_id,
      }))
      const { error: insErr } = await supabase.from('purchases').insert(rows)
      if (insErr) { setLoading(false); setError(insErr.message); return }
    }

    setLoading(false)
    onUpdated(); onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Stock Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Purchase</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full lv-input text-sm"
            />
          </div>

          {hasVariants ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Piece (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full lv-input text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Quantity by colour</label>
                  <span className={`text-xs font-medium ${splitMatches ? 'text-brand-green' : 'text-red-500'}`}>
                    {splitTotal} / {originalQty} {splitMatches ? '✓' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {variants.map(v => (
                    <div key={v.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-gray-700 truncate">{v.color_name}</span>
                      <input
                        type="number"
                        min="0"
                        value={alloc[v.id]}
                        onChange={e => setAllocValue(v.id, e.target.value)}
                        placeholder="0"
                        className="w-24 border border-brand-border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-green"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-400 italic truncate">Uncoloured</span>
                    <input
                      type="number"
                      min="0"
                      value={alloc[UNCOLOURED]}
                      onChange={e => setAllocValue(UNCOLOURED, e.target.value)}
                      placeholder="0"
                      className="w-24 border border-brand-border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Split this entry's {originalQty} units across colours. The numbers must add up to {originalQty}.
                </p>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full lv-input text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Piece (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full lv-input text-sm"
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading || (hasVariants && !splitMatches)} className="px-4 py-2 text-sm lv-btn disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
