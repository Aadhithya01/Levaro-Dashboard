import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddPurchaseModal({ productId, variants = [], onClose, onAdded }) {
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [variantId, setVariantId] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = parseInt(quantity)
    const ppp = parseFloat(price)
    if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (!date) { setError('Select a date'); return }
    if (variants.length > 0 && !variantId) { setError('Select a colour'); return }

    setLoading(true)
    const { error: err } = await supabase.from('purchases').insert({
      product_id: productId,
      date_of_purchase: date,
      quantity: qty,
      price_per_piece: ppp,
      ...(variants.length > 0 && { variant_id: variantId }),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Stock</h2>
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
          {variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
              <select required value={variantId} onChange={e => setVariantId(e.target.value)}
                className="w-full lv-input text-sm">
                <option value="">Select a colour…</option>
                {variants.map(v => <option key={v.id} value={v.id}>{v.color_name}</option>)}
              </select>
            </div>
          )}
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
                placeholder="e.g. 50"
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
                placeholder="e.g. 120"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm lv-btn disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
