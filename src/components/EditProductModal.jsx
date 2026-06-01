import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function EditProductModal({ product, onClose, onUpdated }) {
  const [name, setName] = useState(product.name)
  const [code, setCode] = useState(product.code ?? '')
  const [sellingPrice, setSellingPrice] = useState(product.selling_price != null ? String(product.selling_price) : '')
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
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let image_url = product.image_url
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

    const { error: updateError } = await supabase
      .from('products')
      .update({ name: name.trim(), code: code.trim() || null, selling_price: parseFloat(sellingPrice) || null, image_url })
      .eq('id', product.id)
    setLoading(false)
    if (updateError) {
      if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
      setError(updateError.message)
      return
    }
    if (imageFile && product.image_url) {
      const oldPath = product.image_url.split('/product-images/')[1]
      if (oldPath) await supabase.storage.from('product-images').remove([oldPath])
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    onUpdated()
    onClose()
  }

  const currentImage = imagePreview ?? product.image_url

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 text-brand-green">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selling Price / Piece (₹) <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="e.g. 250"
            />
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
            {currentImage ? (
              <div className="flex items-center gap-3">
                <img src={currentImage} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-brand-border" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-xs text-brand-green hover:underline"
                >
                  Change photo
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
