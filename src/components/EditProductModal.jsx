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
  const [mainImageRemoved, setMainImageRemoved] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const originalExtraItemsRef = useRef([])
  const [variants, setVariants] = useState([]) // existing: { id, color_name, image_url, image_path, salesCount, newName, newFile, newPreviewUrl }
  const [newColors, setNewColors] = useState([]) // { id, name, file, previewUrl }
  const [removedVariantIds, setRemovedVariantIds] = useState([])

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
          removable: true,
          isMainImage: true,
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
      const { data: variantRows } = await supabase
        .from('product_variants')
        .select('id, color_name, image_url, image_path, sales(count)')
        .eq('product_id', product.id)
        .order('created_at')
      setVariants((variantRows ?? []).map(v => ({
        id: v.id,
        color_name: v.color_name,
        image_url: v.image_url,
        image_path: v.image_path,
        salesCount: v.sales?.[0]?.count ?? 0,
        newName: v.color_name,
        newFile: null,
        newPreviewUrl: null,
      })))
      setMediaLoading(false)
    }
    loadMedia()
  }, [product.id, product.image_url])

  const previewCleanupRef = useRef({ variants: [], newColors: [] })
  previewCleanupRef.current = { variants, newColors }
  useEffect(() => () => {
    previewCleanupRef.current.variants.forEach(v => { if (v.newPreviewUrl) URL.revokeObjectURL(v.newPreviewUrl) })
    previewCleanupRef.current.newColors.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl) })
  }, [])

  function handleMediaChange(newItems) {
    // Detect if the main image was removed
    if (!mainImageRemoved && mediaItems.some(i => i.isMainImage) && !newItems.some(i => i.isMainImage)) {
      setMainImageRemoved(true)
    }
    // Track removed product_images rows (not the main image — handled separately)
    const removedFromCurrent = mediaItems.filter(
      old => old.isExisting && old.removable && !old.isMainImage && !newItems.some(n => n.id === old.id)
    )
    if (removedFromCurrent.length) {
      setRemovedIds(prev => [...prev, ...removedFromCurrent.map(r => r.id)])
    }
    setMediaItems(newItems)
  }

  function renameVariant(id, value) {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, newName: value } : v))
  }
  function replaceVariantPhoto(id, file) {
    if (!file) return
    setVariants(prev => prev.map(v => {
      if (v.id !== id) return v
      if (v.newPreviewUrl) URL.revokeObjectURL(v.newPreviewUrl)
      return { ...v, newFile: file, newPreviewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeExistingVariant(id) {
    // Read from the closure (this only runs from a click handler, so state is fresh)
    // to keep the state updaters pure. Capture image_path so submit can delete the
    // storage object without re-fetching.
    const row = variants.find(v => v.id === id)
    if (row?.newPreviewUrl) URL.revokeObjectURL(row.newPreviewUrl)
    setRemovedVariantIds(prev => [...prev, { id, image_path: row?.image_path ?? null }])
    setVariants(prev => prev.filter(v => v.id !== id))
  }
  function addNewColorRow() {
    setNewColors(prev => [...prev, { id: crypto.randomUUID(), name: '', file: null, previewUrl: null }])
  }
  function renameNewColor(id, value) {
    setNewColors(prev => prev.map(c => c.id === id ? { ...c, name: value } : c))
  }
  function setNewColorFile(id, file) {
    if (!file) return
    setNewColors(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.previewUrl) URL.revokeObjectURL(c.previewUrl)
      return { ...c, file, previewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeNewColorRow(id) {
    setNewColors(prev => {
      const row = prev.find(c => c.id === id)
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl)
      return prev.filter(c => c.id !== id)
    })
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
    let newImageUrl = mainImageRemoved ? null : product.image_url
    let extraStartIdx = 0

    // Clean up old main image storage object if it was removed
    if (mainImageRemoved && product.image_url) {
      const oldPath = product.image_url.split('/product-images/')[1]
      if (oldPath) await supabase.storage.from('product-images').remove([oldPath])
    }

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

    // Rename + replace photos on existing variants
    for (const v of variants) {
      const patch = {}
      let newPhotoPath = null
      if (v.newName.trim() && v.newName.trim() !== v.color_name) patch.color_name = v.newName.trim()
      if (v.newFile) {
        const ext = v.newFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, v.newFile)
        if (upErr) { setError(upErr.message); setLoading(false); return }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        patch.image_url = data.publicUrl
        patch.image_path = path
        newPhotoPath = path
      }
      if (Object.keys(patch).length) {
        const { error: varUpdErr } = await supabase.from('product_variants').update(patch).eq('id', v.id)
        if (varUpdErr) {
          // Update failed — drop the just-uploaded photo so it isn't orphaned, keep the old one.
          if (newPhotoPath) await supabase.storage.from('product-images').remove([newPhotoPath])
          setError(varUpdErr.message); setLoading(false); return
        }
        // Update succeeded — now safe to delete the replaced photo.
        if (newPhotoPath && v.image_path) await supabase.storage.from('product-images').remove([v.image_path])
      }
    }

    // Add brand-new colours (no stock — added later via Add Stock)
    for (const c of newColors) {
      if (!c.name.trim() || !c.file) continue
      const ext = c.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, c.file)
      if (upErr) { setError(upErr.message); setLoading(false); return }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      const { error: insErr } = await supabase.from('product_variants').insert({
        product_id: product.id, color_name: c.name.trim(), image_url: data.publicUrl, image_path: path,
      })
      if (insErr) {
        await supabase.storage.from('product-images').remove([path])
        setError(insErr.message); setLoading(false); return
      }
    }

    // Delete removed variants (UI only allows those with no sales) + their photos.
    // image_path was captured when the row was removed from state.
    for (const removed of removedVariantIds) {
      if (removed.image_path) await supabase.storage.from('product-images').remove([removed.image_path])
      await supabase.from('product_variants').delete().eq('id', removed.id)
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colours</label>
            {variants.length === 0 && newColors.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">No colours on this product.</p>
            )}
            <div className="space-y-2">
              {variants.map(v => (
                <div key={v.id} className="flex items-center gap-2 border border-brand-border rounded-lg p-2">
                  <label className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-brand-border cursor-pointer hover:border-brand-green">
                    <img src={v.newPreviewUrl ?? v.image_url} alt="" className="w-full h-full object-cover" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => { replaceVariantPhoto(v.id, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <input type="text" value={v.newName} onChange={e => renameVariant(v.id, e.target.value)}
                    className="flex-1 border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  <button type="button" disabled={v.salesCount > 0} onClick={() => removeExistingVariant(v.id)}
                    title={v.salesCount > 0 ? 'Has sales — cannot remove' : 'Remove colour'}
                    className="text-xs text-red-400 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed">
                    Remove
                  </button>
                </div>
              ))}
              {newColors.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-2 border border-brand-border rounded-lg p-2 bg-brand-cream/40">
                  <label className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 border-dashed border-brand-border flex items-center justify-center cursor-pointer hover:border-brand-green">
                    {c.previewUrl ? <img src={c.previewUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">Photo</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { setNewColorFile(c.id, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <input type="text" value={c.name} onChange={e => renameNewColor(c.id, e.target.value)}
                    placeholder={`New colour ${idx + 1}`}
                    className="flex-1 border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  <button type="button" onClick={() => removeNewColorRow(c.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addNewColorRow}
              className="mt-2 w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
              + Add colour
            </button>
            <p className="text-[11px] text-gray-400 mt-1">New colours start with 0 stock — add stock from the product page.</p>
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
