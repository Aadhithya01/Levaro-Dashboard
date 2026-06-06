import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import MediaUploadSection from './MediaUploadSection'

export default function EditProductModal({ product, onClose, onUpdated }) {
  const [name, setName] = useState(product.name)
  const [code, setCode] = useState(product.code ?? '')
  const [sellingPrice, setSellingPrice] = useState(
    product.selling_price != null ? String(product.selling_price) : ''
  )
  const [mediaItems, setMediaItems] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const originalExtraItemsRef = useRef([])

  useEffect(() => {
    async function loadMedia() {
      const { data } = await supabase
        .from('product_images')
        .select('id, media_url, media_type, sort_order')
        .eq('product_id', product.id)
        .order('sort_order')

      const rows = data ?? []
      originalExtraItemsRef.current = rows.map(row => ({
        id: row.id,
        storagePath: row.media_url.split('/product-images/')[1] ?? null,
      }))

      const items = []
      if (product.image_url) {
        items.push({
          url: product.image_url,
          previewUrl: product.image_url,
          type: 'image',
          isExisting: true,
          removable: false,
        })
      }
      rows.forEach(row => {
        items.push({
          id: row.id,
          url: row.media_url,
          previewUrl: row.media_url,
          type: row.media_type,
          isExisting: true,
          removable: true,
        })
      })
      setMediaItems(items)
      setMediaLoading(false)
    }
    loadMedia()
  }, [product.id, product.image_url])

  function handleMediaChange(newItems) {
    const removedFromCurrent = mediaItems.filter(
      old => old.isExisting && old.removable && !newItems.some(n => n.id === old.id)
    )
    if (removedFromCurrent.length) {
      setRemovedIds(prev => [...prev, ...removedFromCurrent.map(r => r.id)])
    }
    setMediaItems(newItems)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Upload new files first
    const newItems = mediaItems.filter(item => !item.isExisting)
    const uploadedItems = []
    for (const item of newItems) {
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

    // Determine new image_url
    let newImageUrl = product.image_url
    let extraStartIdx = 0
    if (!newImageUrl && uploadedItems.length > 0) {
      newImageUrl = uploadedItems[0].url
      extraStartIdx = 1
    }

    // Insert new product_images rows
    // Get current max sort_order to avoid collisions with surviving rows
    const { data: maxOrderRow } = await supabase
      .from('product_images')
      .select('sort_order')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()
    const baseOrder = maxOrderRow?.sort_order ?? 0

    const insertedRowIds = []
    const extraRows = uploadedItems.slice(extraStartIdx).map((item, i) => ({
      product_id: product.id,
      media_url: item.url,
      media_type: item.type,
      sort_order: baseOrder + i + 1,
    }))
    if (extraRows.length) {
      const { data: insertedRows, error: mediaError } = await supabase
        .from('product_images')
        .insert(extraRows)
        .select('id')
      if (mediaError) {
        await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        setError(mediaError.message)
        setLoading(false)
        return
      }
      insertedRows?.forEach(r => insertedRowIds.push(r.id))
    }

    // Update product row
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        code: code.trim() || null,
        selling_price: parseFloat(sellingPrice) || null,
        image_url: newImageUrl,
      })
      .eq('id', product.id)

    if (updateError) {
      await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
      if (insertedRowIds.length) {
        await supabase.from('product_images').delete().in('id', insertedRowIds)
      }
      setError(updateError.message)
      setLoading(false)
      return
    }

    // All writes succeeded — now safe to delete removed items
    const uniqueRemovedIds = [...new Set(removedIds)]
    for (const removedId of uniqueRemovedIds) {
      const orig = originalExtraItemsRef.current.find(i => i.id === removedId)
      if (orig?.storagePath) {
        await supabase.storage.from('product-images').remove([orig.storagePath])
      }
      await supabase.from('product_images').delete().eq('id', removedId)
    }

    setLoading(false)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
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
              Selling Price / Piece (₹){' '}
              <span className="text-gray-400 font-normal">(optional)</span>
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
          {mediaLoading ? (
            <p className="text-sm text-gray-400">Loading media...</p>
          ) : (
            <MediaUploadSection items={mediaItems} onChange={handleMediaChange} />
          )}
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
