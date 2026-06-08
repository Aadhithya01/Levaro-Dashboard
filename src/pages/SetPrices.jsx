import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function SetPrices() {
  const [groups, setGroups] = useState({})
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, image_url, purchases(quantity, price_per_piece), categories(name)')
      .is('selling_price', null)
      .order('name')
      .then(({ data }) => {
        const g = {}
        ;(data ?? []).forEach(p => {
          const cat = p.categories?.name ?? 'Uncategorised'
          const totalQty = (p.purchases ?? []).reduce((s, x) => s + x.quantity, 0)
          const totalCost = (p.purchases ?? []).reduce((s, x) => s + x.quantity * x.price_per_piece, 0)
          if (!g[cat]) g[cat] = []
          g[cat].push({ ...p, avgCost: totalQty > 0 ? totalCost / totalQty : null })
        })
        setGroups(g)
        setLoading(false)
      })
  }, [])

  function setPrice(id, val) {
    setPrices(prev => ({ ...prev, [id]: val }))
  }

  async function handleSave() {
    const entries = Object.entries(prices).filter(([, v]) => v.trim() !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0)
    if (!entries.length) return
    setSaving(true)
    await Promise.all(
      entries.map(([id, val]) =>
        supabase.from('products').update({ selling_price: parseFloat(val) }).eq('id', id)
      )
    )
    setSavedCount(entries.length)
    setSaving(false)
    const savedIds = new Set(entries.map(([id]) => id))
    setGroups(prev => {
      const next = {}
      Object.entries(prev).forEach(([cat, prods]) => {
        const remaining = prods.filter(p => !savedIds.has(p.id))
        if (remaining.length) next[cat] = remaining
      })
      return next
    })
    setPrices({})
  }

  const totalRemaining = Object.values(groups).reduce((s, arr) => s + arr.length, 0)
  const filledCount = Object.values(prices).filter(v => v.trim() !== '' && parseFloat(v) > 0).length

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-green">Set Product Prices</h1>
            <p className="text-sm text-gray-400 mt-1">
              {loading ? 'Loading...' : `${totalRemaining} product${totalRemaining !== 1 ? 's' : ''} need a selling price`}
            </p>
          </div>
          {!loading && totalRemaining > 0 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="px-5 py-2 bg-brand-green text-brand-gold text-sm font-semibold rounded hover:opacity-90 disabled:opacity-40"
            >
              {saving ? 'Saving...' : `Save ${filledCount > 0 ? filledCount + ' ' : ''}Price${filledCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {savedCount !== null && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            {savedCount} price{savedCount !== 1 ? 's' : ''} saved.{' '}
            {totalRemaining > 0 ? `${totalRemaining} still need a price.` : ' All done!'}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : totalRemaining === 0 ? (
          <div className="text-center py-20">
            <p className="text-brand-green font-semibold text-lg">All products have prices set!</p>
            <p className="text-gray-400 text-sm mt-1">Every product now shows a price in the customer shop.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([category, products]) => (
              <div key={category}>
                <h2 className="text-xs font-bold text-brand-green uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-4 bg-brand-green rounded-full" />
                  {category}
                  <span className="text-gray-400 font-normal normal-case tracking-normal">{products.length} product{products.length !== 1 ? 's' : ''}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Image */}
                      <div className="aspect-square bg-brand-green/5">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl font-bold text-brand-green/20">
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info + price input */}
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
                          {product.name}
                        </p>

                        {product.avgCost != null && (
                          <p className="text-xs text-gray-400">
                            Cost: <span className="text-gray-600 font-medium">₹{product.avgCost.toFixed(0)}</span>
                          </p>
                        )}

                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={prices[product.id] ?? ''}
                            onChange={e => setPrice(product.id, e.target.value)}
                            placeholder="Selling price"
                            className="w-full border border-brand-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sticky save bar when prices are filled */}
        {filledCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-green text-brand-gold px-6 py-3 rounded-full shadow-xl flex items-center gap-3 text-sm font-semibold">
            <span>{filledCount} price{filledCount !== 1 ? 's' : ''} ready</span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-gold text-brand-green px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
