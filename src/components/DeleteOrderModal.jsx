import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteOrderModal({ order, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    const { error: delErr } = await supabase.from('vendor_orders').delete().eq('id', order.id)
    if (delErr) { setError(delErr.message); setLoading(false); return }
    if (order.bill_path) await supabase.storage.from('order-bills').remove([order.bill_path])
    setLoading(false)
    onDeleted()
    onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2 text-brand-green">Delete Order</h2>
        <p className="text-sm text-gray-600 mb-4">
          Delete the order from <span className="font-semibold">{order.vendor_name}</span>? This also removes the attached bill. This cannot be undone.
        </p>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:opacity-90 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
