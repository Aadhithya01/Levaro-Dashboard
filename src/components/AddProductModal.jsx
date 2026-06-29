import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import MediaUploadSection from './MediaUploadSection'

export default function AddProductModal({ categoryId, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [mediaItems, setMediaItems] = useState([])
  const [hasColors, setHasColors] = useState(false)
  const [colors, setColors] = useState([]) // { id, name, qty, file, previewUrl }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Revoke colour preview object URLs only on unmount (a ref mirrors the latest
  // colours so the cleanup doesn't fire on every edit). Replace/remove revoke inline.
  const colorsRef = useRef([])
  colorsRef.current = colors
  useEffect(() => () => {
    colorsRef.current.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl) })
  }, [])

  function addColorRow() {
    setColors(prev => [...prev, { id: crypto.randomUUID(), name: '', qty: '', file: null, previewUrl: null }])
  }
  function updateColor(id, patch) {
    setColors(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  function setColorFile(id, file) {
    if (!file) return
    setColors(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.previewUrl) URL.revokeObjectURL(c.previewUrl)
      return { ...c, file, previewUrl: URL.createObjectURL(file) }
    }))
  }
  function removeColorRow(id) {
    setColors(prev => {
      const row = prev.find(c => c.id === id)
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl)
      return prev.filter(c => c.id !== id)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const ppp = parseFloat(price)
    const sp = parseFloat(sellingPrice)
    if (isNaN(ppp) || ppp <= 0) { setError('Enter a valid price'); return }
    if (isNaN(sp) || sp <= 0) { setError('Enter a valid selling price'); return }

    let qty = 0
    if (hasColors) {
      if (colors.length === 0) { setError('Add at least one colour'); return }
      for (const c of colors) {
        if (!c.name.trim()) { setError('Each colour needs a name'); return }
        if (!c.file) { setError(`Add a photo for "${c.name || 'colour'}"`); return }
        const n = parseInt(c.qty)
        if (isNaN(n) || n < 1) { setError('Each colour needs a valid quantity'); return }
      }
    } else {
      qty = parseInt(quantity)
      if (isNaN(qty) || qty < 1) { setError('Enter a valid quantity'); return }
    }

    setLoading(true)
    setError('')

    // Upload general media
    const uploadedItems = []
    for (const item of mediaItems) {
      const ext = item.file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, item.file)
      if (uploadError) {
        if (uploadedItems.length) await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
        setError(uploadError.message); setLoading(false); return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      uploadedItems.push({ path, url: data.publicUrl, type: item.type })
    }

    // Upload colour photos
    const colorUploads = [] // { path, url, name, qty }
    if (hasColors) {
      for (const c of colors) {
        const ext = c.file.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, c.file)
        if (upErr) {
          const cleanup = [...uploadedItems.map(i => i.path), ...colorUploads.map(i => i.path)]
          if (cleanup.length) await supabase.storage.from('product-images').remove(cleanup)
          setError(upErr.message); setLoading(false); return
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        colorUploads.push({ path, url: data.publicUrl, name: c.name.trim(), qty: parseInt(c.qty) })
      }
    }

    const allUploadPaths = [...uploadedItems.map(i => i.path), ...colorUploads.map(i => i.path)]
    const image_url = uploadedItems[0]?.url ?? colorUploads[0]?.url ?? null

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
      if (allUploadPaths.length) await supabase.storage.from('product-images').remove(allUploadPaths)
      setError(insertError.message); setLoading(false); return
    }

    // Extra general media (index 1+) into product_images
    if (uploadedItems.length > 1) {
      const rows = uploadedItems.slice(1).map((item, i) => ({
        product_id: product.id, media_url: item.url, media_type: item.type, sort_order: i + 1,
      }))
      const { error: mediaError } = await supabase.from('product_images').insert(rows)
      if (mediaError) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(mediaError.message); setLoading(false); return
      }
    }

    const today = new Date().toISOString().slice(0, 10)

    if (hasColors) {
      // Insert variants, then one purchase per variant
      const variantRows = colorUploads.map(c => ({
        product_id: product.id, color_name: c.name, image_url: c.url, image_path: c.path,
      }))
      const { data: variants, error: varErr } = await supabase
        .from('product_variants').insert(variantRows).select('id')
      if (varErr) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(varErr.message); setLoading(false); return
      }
      // PostgreSQL preserves insertion order for a bulk INSERT ... RETURNING,
      // so variants[i] corresponds to colorUploads[i].
      const purchaseRows = variants.map((v, i) => ({
        product_id: product.id, date_of_purchase: today,
        quantity: colorUploads[i].qty, price_per_piece: ppp, variant_id: v.id,
      }))
      const { error: purErr } = await supabase.from('purchases').insert(purchaseRows)
      if (purErr) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(purErr.message); setLoading(false); return
      }
    } else {
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({ product_id: product.id, date_of_purchase: today, quantity: qty, price_per_piece: ppp })
      if (purchaseError) {
        await supabase.storage.from('product-images').remove(allUploadPaths)
        await supabase.from('products').delete().eq('id', product.id)
        setError(purchaseError.message); setLoading(false); return
      }
    }

    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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
            {!hasColors && (
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
            )}
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={hasColors}
                onChange={e => { setHasColors(e.target.checked); if (e.target.checked && colors.length === 0) addColorRow() }} />
              Multiple colour options
            </label>
            {hasColors && (
              <div className="mt-3 space-y-3">
                {colors.map((c, idx) => (
                  <div key={c.id} className="border border-brand-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Colour {idx + 1}</span>
                      <button type="button" onClick={() => removeColorRow(c.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-green">
                        {c.previewUrl
                          ? <img src={c.previewUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] text-gray-400 text-center px-1">Add photo</span>}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { setColorFile(c.id, e.target.files[0]); e.target.value = '' }} />
                      </label>
                      <div className="flex-1 space-y-2">
                        <input type="text" value={c.name} onChange={e => updateColor(c.id, { name: e.target.value })}
                          className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          placeholder="Colour name (e.g. Rose Gold)" />
                        <input type="number" min="1" value={c.qty} onChange={e => updateColor(c.id, { qty: e.target.value })}
                          className="w-full border border-brand-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          placeholder="Quantity" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addColorRow}
                  className="w-full border-2 border-dashed border-brand-border rounded-lg py-2 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors">
                  + Add colour
                </button>
              </div>
            )}
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
