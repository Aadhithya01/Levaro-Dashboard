import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeleteProductModal({ product, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState(false)

  const hasData = product.purchases.length > 0 || product.sales.length > 0

  async function handleDelete() {
    setLoading(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
    if (deleteError) { setError(deleteError.message); setLoading(false); return }

    if (product.image_url) {
      const path = product.image_url.split('/product-images/')[1]
      if (path) await supabase.storage.from('product-images').remove([path])
    }

    setDeleted(true)
    onDeleted()
    setTimeout(() => onClose(), 1500)
  }

  if (deleted) return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-800">Product deleted</p>
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
          <h2 className="text-base font-semibold text-gray-800">Delete &ldquo;{product.name}&rdquo;?</h2>
        </div>

        {hasData ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-red-700 font-medium">This product has purchase and sale records.</p>
            <p className="text-xs text-red-600 mt-0.5">All associated data will be permanently deleted.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
        )}

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
