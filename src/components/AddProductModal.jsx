import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = parseInt(quantity)
    const ppp = parseFloat(price)
    if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }

    setLoading(true)
    setError('')

    let image_url = null
    let uploadedPath = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      uploadedPath = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(uploadedPath, imageFile)
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data } = supabase.storage.from('product-images').getPublicUrl(uploadedPath)
      image_url = data.publicUrl
    }

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({ name: name.trim(), category_id: categoryId, ...(code.trim() && { code: code.trim() }), ...(image_url && { image_url }) })
      .select()
      .single()
    if (insertError) {
      if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
      setError(insertError.message)
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({ product_id: product.id, date_of_purchase: today, quantity: qty, price_per_piece: ppp })
    setLoading(false)
    if (purchaseError) { setError(purchaseError.message); return }

    if (imagePreview) URL.revokeObjectURL(imagePreview)
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Price / Piece (₹)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => { URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null) }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
              >
                📷 Add photo
              </button>
            )}
          </div>
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
