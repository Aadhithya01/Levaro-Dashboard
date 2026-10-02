import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { CHAIN_TYPES, CHAIN_COLOURS, PENDANT_STYLES, isChainCategory } from '../lib/chainFilters'

export default function SetFilters() {
  const [groups, setGroups] = useState({})
  const [tags, setTags] = useState({}) // id -> { type, colour, pendant }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, image_url, chain_type, chain_colour, pendant_style, categories(name)')
      .or('chain_type.is.null,chain_colour.is.null,pendant_style.is.null')
      .order('name')
      .then(({ data }) => {
        const g = {}
        ;(data ?? [])
          .filter(p => isChainCategory(p.categories?.name))
          .forEach(p => {
            const cat = p.categories?.name ?? 'Uncategorised'
            if (!g[cat]) g[cat] = []
            g[cat].push(p)
          })
        setGroups(g)
        setLoading(false)
      })
  }, [])

  function setTag(id, patch) {
    setTags(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function handleSave() {
    const entries = Object.entries(tags).filter(([, v]) => v.type || v.colour || v.pendant)
    if (!entries.length) return
    setSaving(true)
    await Promise.all(
      entries.map(([id, v]) =>
        supabase.from('products').update({
          ...(v.type && { chain_type: v.type }),
          ...(v.colour && { chain_colour: v.colour }),
          ...(v.pendant && { pendant_style: v.pendant }),
        }).eq('id', id)
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
    setTags({})
  }

  const totalRemaining = Object.values(groups).reduce((s, arr) => s + arr.length, 0)
  const filledCount = Object.values(tags).filter(v => v.type || v.colour || v.pendant).length

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="lv-page max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-green">Set Chain Filters</h1>
            <p className="text-sm text-gray-400 mt-1">
              {loading ? 'Loading...' : `${totalRemaining} chain${totalRemaining !== 1 ? 's' : ''} need a type, colour, and/or pendant tag`}
            </p>
          </div>
          {!loading && totalRemaining > 0 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="px-5 py-2 lv-btn text-sm font-semibold disabled:opacity-40"
            >
              {saving ? 'Saving...' : `Save ${filledCount > 0 ? filledCount + ' ' : ''}Tag${filledCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {savedCount !== null && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            {savedCount} chain{savedCount !== 1 ? 's' : ''} tagged.{' '}
            {totalRemaining > 0 ? `${totalRemaining} still need a tag.` : ' All done!'}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
          </div>
        ) : totalRemaining === 0 ? (
          <div className="text-center py-20">
            <p className="text-brand-green font-semibold text-lg">All chains are tagged!</p>
            <p className="text-gray-400 text-sm mt-1">Every chain now has a type and colour filter set.</p>
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
                    <div key={product.id} className="lv-card lv-lift overflow-hidden">
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

                      <div className="p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
                          {product.name}
                        </p>

                        <select
                          value={tags[product.id]?.type ?? product.chain_type ?? ''}
                          onChange={e => setTag(product.id, { type: e.target.value })}
                          className="w-full border border-brand-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                          <option value="">Type: —</option>
                          {CHAIN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>

                        <select
                          value={tags[product.id]?.colour ?? product.chain_colour ?? ''}
                          onChange={e => setTag(product.id, { colour: e.target.value })}
                          className="w-full border border-brand-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                          <option value="">Colour: —</option>
                          {CHAIN_COLOURS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>

                        <select
                          value={tags[product.id]?.pendant ?? product.pendant_style ?? ''}
                          onChange={e => setTag(product.id, { pendant: e.target.value })}
                          className="w-full border border-brand-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                          <option value="">Pendant: —</option>
                          {PENDANT_STYLES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filledCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-green text-brand-gold px-6 py-3 rounded-full shadow-xl flex items-center gap-3 text-sm font-semibold">
            <span>{filledCount} tag{filledCount !== 1 ? 's' : ''} ready</span>
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
