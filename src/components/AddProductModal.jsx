import { useState } from 'react'
import { supabase } from '../lib/supabase'
import MediaUploadSection from './MediaUploadSection'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = parseInt(quantity)
    const ppp = parseFloat(price)
    const sp = parseFloat(sellingPrice)
    if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (isNaN(sp) || sp <= 0) { setError('Enter a valid selling price'); return }

    setLoading(true)
    setError('')

    // Upload all selected media files
    const uploadedItems = []
    for (const item of mediaItems) {
      const ext = item.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, item.file)
      if (uploadError) {
        if (uploadedItems.length) {
          await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        }
        setError(uploadError.message)
        setLoading(false)
        return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      uploadedItems.push({ path, url: data.publicUrl, type: item.type })
    }

    const image_url = uploadedItems[0]?.url ?? null

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        category_id: categoryId,
        selling_price: sp,
        ...(code.trim() && { code: code.trim() }),
        ...(image_url && { image_url }),
      })
      .select()
      .single()
    if (insertError) {
      if (uploadedItems.length) {
        await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
      }
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Insert extra media (index 1+) into product_images
    if (uploadedItems.length > 1) {
      const rows = uploadedItems.slice(1).map((item, i) => ({
        product_id: product.id,
        media_url: item.url,
        media_type: item.type,
        sort_order: i,
      }))
      const { error: mediaError } = await supabase.from('product_images').insert(rows)
      if (mediaError) { setError(mediaError.message); setLoading(false); return }
    }

    const today = new Date().toISOString().slice(0, 10)
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({ product_id: product.id, date_of_purchase: today, quantity: qty, price_per_piece: ppp })
    setLoading(false)
    if (purchaseError) { setError(purchaseError.message); return }

    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Add Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. Gold Earrings"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. GE-001"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price / Piece (₹)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                placeholder="e.g. 120"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price / Piece (₹)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250"
            />
          </div>
          <MediaUploadSection items={mediaItems} onChange={setMediaItems} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
