import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddSaleModal({ productId, onClose, onAdded }) {
  const [form, setForm] = useState({ sale_date: '', quantity_sold: '', selling_price: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('sales').insert({
      product_id: productId,
      sale_date: form.sale_date,
      quantity_sold: parseInt(form.quantity_sold),
      selling_price: parseFloat(form.selling_price),
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input type="date" required value={form.sale_date} onChange={e => set('sale_date', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
            <input type="number" min="1" required value={form.quantity_sold} onChange={e => set('quantity_sold', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price per Piece (₹)</label>
            <input type="number" min="0.01" step="0.01" required value={form.selling_price} onChange={e => set('selling_price', e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250.00" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
