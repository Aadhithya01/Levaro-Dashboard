import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteCategoryModal({ category, productCount, onClose, onDeleted }) {
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState(false)

  const matches = confirmName === category.name

  async function handleDelete() {
    setLoading(true)
    setError('')

    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, image_url')
      .eq('category_id', category.id)
    if (fetchError) { setError(fetchError.message); setLoading(false); return }

    if (products && products.length > 0) {
      const { error: prodError } = await supabase
        .from('products')
        .delete()
        .in('id', products.map(p => p.id))
      if (prodError) { setError(prodError.message); setLoading(false); return }
    }

    const { error: catError } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
    if (catError) { setError(catError.message); setLoading(false); return }

    const productImagePaths = (products ?? [])
      .map(p => p.image_url?.split('/product-images/')[1])
      .filter(Boolean)
    if (productImagePaths.length > 0) {
      await supabase.storage.from('product-images').remove(productImagePaths)
    }
    if (category.image_url) {
      const catPath = category.image_url.split('/category-images/')[1]
      if (catPath) await supabase.storage.from('category-images').remove([catPath])
    }

    setDeleted(true)
    onDeleted()
    setTimeout(() => onClose(), 2500)
  }

  if (deleted) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-64 text-center">
        <img src="/deleted.jpg" alt="" className="w-full object-cover" />
        <p className="text-brand-green font-bold py-3 tracking-widest text-sm uppercase">Deleted!</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-800">Delete Category</h2>
        </div>

        {productCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-red-700 font-medium">
              This category contains {productCount} product{productCount !== 1 ? 's' : ''}.
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              All products, purchases, and sales will be permanently deleted.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-3">
          Type <span className="font-semibold text-gray-800">{category.name}</span> to confirm deletion.
        </p>
        <input
          type="text"
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          placeholder={category.name}
          className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!matches || loading}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
