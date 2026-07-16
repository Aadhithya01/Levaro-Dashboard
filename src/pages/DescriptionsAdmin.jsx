import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function DescRow({ product, onSaved }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const val = text.trim()
    if (!val) return
    setSaving(true)
    const { error } = await supabase.from('products').update({ description: val }).eq('id', product.id)
    setSaving(false)
    if (!error) onSaved(product.id)
  }

  return (
    <div className="lv-card px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded bg-brand-cream flex items-center justify-center text-brand-green/40 flex-shrink-0 text-sm font-semibold">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
          {product.code && <p className="text-xs text-gray-400 truncate">{product.code}</p>}
        </div>
      </div>
      <textarea
        rows={2}
        maxLength={2000}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write a description for this product…"
        className="w-full lv-input text-sm resize-none"
      />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !text.trim()}
          className="lv-btn px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function DescriptionsAdmin() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchMissing() {
    const { data } = await supabase
      .from('products')
      .select('id, name, code, image_url, description')
      .order('name')
    setProducts((data ?? []).filter(p => !p.description || !p.description.trim()))
    setLoading(false)
  }

  useEffect(() => { fetchMissing() }, [])

  function handleSaved(id) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="lv-page max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <h1 className="text-xl font-bold text-brand-green mb-2">Product Descriptions</h1>
        <p className="text-gray-400 text-xs mb-6">
          Products still missing a shop description. Add one and it drops off this list.
        </p>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-700 text-sm font-medium mb-1">All products have descriptions ✓</p>
            <p className="text-gray-400 text-xs">Change an existing one from its product page (Edit Product).</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">{products.length} without a description</p>
            {products.map(p => <DescRow key={p.id} product={p} onSaved={handleSaved} />)}
          </div>
        )}
      </div>
    </div>
  )
}
