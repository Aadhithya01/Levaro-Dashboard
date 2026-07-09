import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddOrderModal({ onClose, onAdded }) {
  const [vendorName, setVendorName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [location, setLocation] = useState('')
  const [bill, setBill] = useState(null) // { file, previewUrl, isPdf }
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
    setBill({ file, previewUrl, isPdf })
  }

  function removeBill() {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    setBill(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!vendorName.trim()) { setError('Enter the vendor name'); return }
    setLoading(true)
    setError('')

    let bill_url = null
    let bill_path = null
    if (bill) {
      const ext = bill.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('order-bills').upload(path, bill.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('order-bills').getPublicUrl(path)
      bill_url = data.publicUrl
      bill_path = path
    }

    const { data: auth } = await supabase.auth.getUser()
    const { error: insErr } = await supabase.from('vendor_orders').insert({
      vendor_name: vendorName.trim(),
      phone: phone.trim() || null,
      order_price: orderPrice ? parseFloat(orderPrice) : null,
      quantity: quantity ? parseInt(quantity) : null,
      location: location.trim() || null,
      bill_url,
      bill_path,
      created_by: auth?.user?.id ?? null,
    })
    if (insErr) {
      if (bill_path) await supabase.storage.from('order-bills').remove([bill_path])
      setError(insErr.message); setLoading(false); return
    }
    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Log Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input type="text" required value={vendorName} onChange={e => setVendorName(e.target.value)}
              className="w-full lv-input text-sm"
              placeholder="e.g. Sri Gold Suppliers" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full lv-input text-sm"
              placeholder="e.g. 9876543210" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Price (₹)</label>
              <input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)}
                className="w-full lv-input text-sm"
                placeholder="e.g. 12000" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full lv-input text-sm"
                placeholder="e.g. 20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full lv-input text-sm"
              placeholder="e.g. Chennai" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Copy <span className="text-gray-400 font-normal">(optional, image or PDF)</span></label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {bill ? (
              <div className="relative inline-flex items-center gap-2 border border-brand-border rounded-lg p-2">
                {bill.isPdf
                  ? <span className="text-sm text-brand-green">📄 {bill.file.name}</span>
                  : <img src={bill.previewUrl} alt="" className="w-16 h-16 object-cover rounded" />}
                <button type="button" onClick={removeBill}
                  className="bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-500">✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
                Attach bill copy
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm lv-btn disabled:opacity-50">
              {loading ? 'Saving...' : 'Log Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
