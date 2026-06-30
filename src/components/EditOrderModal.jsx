import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditOrderModal({ order, onClose, onUpdated }) {
  const [vendorName, setVendorName] = useState(order.vendor_name ?? '')
  const [phone, setPhone] = useState(order.phone ?? '')
  const [orderPrice, setOrderPrice] = useState(order.order_price != null ? String(order.order_price) : '')
  const [quantity, setQuantity] = useState(order.quantity != null ? String(order.quantity) : '')
  const [location, setLocation] = useState(order.location ?? '')
  const [newBill, setNewBill] = useState(null) // { file, previewUrl, isPdf }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const urlRef = useRef(null)

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50 MB)'); return }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const isPdf = file.type === 'application/pdf'
    const previewUrl = isPdf ? null : URL.createObjectURL(file)
    urlRef.current = previewUrl
    setNewBill({ file, previewUrl, isPdf })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!vendorName.trim()) { setError('Enter the vendor name'); return }
    setLoading(true)
    setError('')

    let bill_url = order.bill_url
    let bill_path = order.bill_path
    if (newBill) {
      const ext = newBill.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('order-bills').upload(path, newBill.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('order-bills').getPublicUrl(path)
      bill_url = data.publicUrl
      bill_path = path
    }

    const { error: updErr } = await supabase.from('vendor_orders').update({
      vendor_name: vendorName.trim(),
      phone: phone.trim() || null,
      order_price: orderPrice ? parseFloat(orderPrice) : null,
      quantity: quantity ? parseInt(quantity) : null,
      location: location.trim() || null,
      bill_url,
      bill_path,
    }).eq('id', order.id)

    if (updErr) {
      if (newBill && bill_path) await supabase.storage.from('order-bills').remove([bill_path])
      setError(updErr.message); setLoading(false); return
    }
    // Update succeeded — remove the old bill file if it was replaced
    if (newBill && order.bill_path) {
      await supabase.storage.from('order-bills').remove([order.bill_path])
    }
    setLoading(false)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input type="text" required value={vendorName} onChange={e => setVendorName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Price (₹)</label>
              <input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Copy</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {newBill ? (
              <div className="inline-flex items-center gap-2 border border-brand-border rounded-lg p-2">
                {newBill.isPdf
                  ? <span className="text-sm text-brand-green">📄 {newBill.file.name}</span>
                  : <img src={newBill.previewUrl} alt="" className="w-16 h-16 object-cover rounded" />}
                <span className="text-xs text-gray-400">(new)</span>
              </div>
            ) : order.bill_url ? (
              <a href={order.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-green hover:underline">View current bill ↗</a>
            ) : (
              <p className="text-sm text-gray-400">No bill attached</p>
            )}
            <button type="button" onClick={() => fileRef.current.click()}
              className="mt-2 w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
              {order.bill_url || newBill ? 'Replace bill copy' : 'Attach bill copy'}
            </button>
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
