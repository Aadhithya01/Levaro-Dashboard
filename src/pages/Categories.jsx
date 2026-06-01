import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddCategoryModal from '../components/AddCategoryModal'
import EditCategoryModal from '../components/EditCategoryModal'
import DeleteCategoryModal from '../components/DeleteCategoryModal'

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const navigate = useNavigate()

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(count)')
      .order('created_at', { ascending: true })
    if (error) { console.error('Failed to fetch categories:', error); setLoading(false); return }
    setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const totalProducts = categories.reduce((sum, c) => sum + (c.products?.[0]?.count ?? 0), 0)

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-brand-green">Categories</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Category
          </button>
        </div>

        {!loading && categories.length > 0 && (
          <div className="flex gap-5 mb-6">
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{categories.length}</span>
              <span className="text-gray-400 ml-1">categories</span>
            </div>
            <div className="bg-white rounded-lg border border-brand-border px-4 py-2 text-sm">
              <span className="font-semibold text-brand-green">{totalProducts}</span>
              <span className="text-gray-400 ml-1">products total</span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">No categories yet</p>
            <p className="text-gray-400 text-xs mb-5">Create your first category to start organising products</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => {
              const count = cat.products?.[0]?.count ?? 0
              return cat.image_url ? (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-brand-green transition-all shadow-sm"
                >
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="font-bold text-white text-sm">{cat.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-brand-gold">{count} product{count !== 1 ? 's' : ''}</p>
                      {cat.code && <span className="text-xs text-white/50">· {cat.code}</span>}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                      className="bg-white/90 hover:bg-white rounded-full p-1.5"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeletingCategory(cat) }}
                      className="bg-white/90 hover:bg-red-50 rounded-full p-1.5"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/categories/${cat.id}`)}
                  className="relative group bg-white rounded-xl p-6 flex flex-col items-center cursor-pointer border border-brand-border hover:border-brand-green hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-brand-green flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-brand-gold">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                  {cat.code && <p className="text-xs text-brand-green/60 font-mono mt-0.5">{cat.code}</p>}
                  <p className="text-xs text-gray-400 mt-1">{count} product{count !== 1 ? 's' : ''}</p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingCategory(cat) }}
                      className="bg-brand-cream hover:bg-brand-border rounded-full p-1.5"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeletingCategory(cat) }}
                      className="bg-brand-cream hover:bg-red-50 rounded-full p-1.5"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddCategoryModal onClose={() => setShowModal(false)} onAdded={fetchCategories} />
      )}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onUpdated={fetchCategories}
        />
      )}
      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          productCount={deletingCategory.products?.[0]?.count ?? 0}
          onClose={() => setDeletingCategory(null)}
          onDeleted={fetchCategories}
        />
      )}
    </div>
  )
}
