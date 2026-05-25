import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddPurchaseModal({ productId, onClose, onAdded }) {
  const [form, setForm] = useState({ date_of_purchase: '', quantity: '', price_per_piece: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('purchases').insert({
      product_id: productId,
      date_of_purchase: form.date_of_purchase,
      quantity: parseInt(form.quantity),
      price_per_piece: parseFloat(form.price_per_piece),
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Add Purchase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Purchase</label>
            <input type="date" required value={form.date_of_purchase} onChange={e => set('date_of_purchase', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" min="1" required value={form.quantity} onChange={e => set('quantity', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Piece (₹)</label>
            <input type="number" min="0.01" step="0.01" required value={form.price_per_piece} onChange={e => set('price_per_piece', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 120.00" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
