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
      .select('id, name, selling_price, categories(name)')
      .is('selling_price', null)
      .order('name')
      .then(({ data }) => {
        const g = {}
        ;(data ?? []).forEach(p => {
          const cat = p.categories?.name ?? 'Uncategorised'
          if (!g[cat]) g[cat] = []
          g[cat].push(p)
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
    // Remove saved products from groups
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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-green">Set Product Prices</h1>
            <p className="text-sm text-gray-400 mt-1">
              {loading ? 'Loading...' : `${totalRemaining} products need a price`}
            </p>
          </div>
          {!loading && totalRemaining > 0 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="px-5 py-2 bg-brand-green text-brand-gold text-sm font-semibold rounded hover:opacity-90 disabled:opacity-40"
            >
              {saving ? 'Saving...' : `Save ${filledCount > 0 ? filledCount : ''} Price${filledCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {savedCount !== null && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            {savedCount} price{savedCount !== 1 ? 's' : ''} saved. {totalRemaining > 0 ? `${totalRemaining} still need a price.` : 'All done!'}
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
          <div className="space-y-6">
            {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([category, products]) => (
              <div key={category} className="bg-white rounded-lg border border-brand-border overflow-hidden">
                <div className="bg-brand-green px-4 py-2">
                  <h2 className="text-brand-gold text-xs font-bold uppercase tracking-wider">{category}</h2>
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-brand-border">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-brand-cream">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{product.name}</td>
                        <td className="px-4 py-3 w-36">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={prices[product.id] ?? ''}
                              onChange={e => setPrice(product.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-brand-border rounded pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
