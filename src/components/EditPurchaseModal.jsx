import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditPurchaseModal({ purchase, onClose, onUpdated }) {
  const [quantity, setQuantity] = useState(String(purchase.quantity))
  const [price, setPrice] = useState(String(purchase.price_per_piece))
  const [date, setDate] = useState(purchase.date_of_purchase)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = parseInt(quantity)
    const ppp = parseFloat(price)
    if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (!date) { setError('Select a date'); return }

    setLoading(true)
    const { error: err } = await supabase.from('purchases').update({
      date_of_purchase: date,
      quantity: qty,
      price_per_piece: ppp,
    }).eq('id', purchase.id)
    setLoading(false)
    if (err) { setError(err.message); return }
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Stock Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Purchase</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
