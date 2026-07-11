import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const STATUSES = ['new', 'confirmed', 'delivered', 'cancelled']

const STATUS_META = {
  new:       { label: 'New',       pill: 'bg-amber-50 text-amber-700 border-amber-300' },
  confirmed: { label: 'Confirmed', pill: 'bg-blue-50 text-blue-700 border-blue-300' },
  delivered: { label: 'Delivered', pill: 'bg-green-50 text-green-700 border-green-400' },
  cancelled: { label: 'Cancelled', pill: 'bg-gray-100 text-gray-500 border-gray-300' },
}

const PAYMENT_META = {
  upi: { label: 'UPI', pill: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  cod: { label: 'COD', pill: 'bg-gray-100 text-gray-600 border-gray-300' },
}

function paymentLabel(o) {
  const method = PAYMENT_META[o.payment_method] ?? PAYMENT_META.cod
  const statusWord = o.payment_status === 'claimed' ? 'claimed' : 'unpaid'
  return { ...method, statusWord }
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirmingDelete, setConfirmingDelete] = useState(null)

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('customer_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Failed to fetch customer orders:', error); setLoading(false); return }
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const counts = useMemo(() => {
    const c = { all: orders.length, new: 0, confirmed: 0, delivered: 0, cancelled: 0 }
    orders.forEach(o => { if (c[o.status] != null) c[o.status] += 1 })
    return c
  }, [orders])

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  async function changeStatus(id, status) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)) // optimistic
    const { error } = await supabase.from('customer_orders').update({ status }).eq('id', id)
    if (error) { console.error('Failed to update status:', error); fetchOrders() }
  }

  async function deleteOrder(id) {
    setConfirmingDelete(null)
    setOrders(prev => prev.filter(o => o.id !== id)) // optimistic
    const { error } = await supabase.from('customer_orders').delete().eq('id', id)
    if (error) { console.error('Failed to delete order:', error); fetchOrders() }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <h1 className="text-xl font-bold text-brand-green mb-4">Customer Orders</h1>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {['all', ...STATUSES].map(key => {
            const active = filter === key
            const label = key === 'all' ? 'All' : STATUS_META[key].label
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-brand-green text-brand-gold border-brand-green'
                    : 'bg-white text-gray-600 border-brand-border hover:border-brand-green'
                }`}
              >
                {label} <span className={active ? 'text-brand-gold/80' : 'text-gray-400'}>({counts[key]})</span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No customer orders{filter !== 'all' ? ` in "${STATUS_META[filter].label}"` : ' yet'}</p>
            <p className="text-gray-400 text-xs">Orders placed from the storefront checkout will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(o => {
              const items = Array.isArray(o.items) ? o.items : []
              const meta = STATUS_META[o.status] ?? STATUS_META.new
              return (
                <div key={o.id} className="bg-white rounded-lg border border-brand-border p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-green truncate">{o.customer_name}</p>
                      <p className="text-xs text-gray-400">{formatWhen(o.created_at)}</p>
                    </div>
                    <select
                      value={o.status}
                      onChange={e => changeStatus(o.id, e.target.value)}
                      className={`text-xs font-medium border rounded-full px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-green cursor-pointer ${meta.pill}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                  </div>

                  {/* Contact */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                    <a href={`tel:${o.phone}`} className="text-brand-green hover:underline">📞 {o.phone}</a>
                    {o.location_url && (
                      <a href={o.location_url} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">📍 Location ↗</a>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1"><span className="text-gray-400">Address:</span> {o.address}</p>
                  {o.landmark && <p className="text-sm text-gray-600 mb-3"><span className="text-gray-400">Landmark:</span> {o.landmark}</p>}

                  {/* Items */}
                  <div className="mt-3 border-t border-brand-border pt-3">
                    <ul className="space-y-1">
                      {items.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate pr-2">
                            {it.name}
                            {it.color ? <span className="text-gray-400"> — {it.color}</span> : null}
                            <span className="text-gray-400"> × {it.qty}</span>
                          </span>
                          <span className="text-gray-600 whitespace-nowrap">₹{(Number(it.price) * Number(it.qty)).toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-green">Total: ₹{Number(o.total).toFixed(0)}</span>
                        {(() => {
                          const p = paymentLabel(o)
                          return (
                            <span className={`text-[11px] font-medium border rounded-full px-2 py-0.5 ${p.pill}`}>
                              {p.label} · {p.statusWord}
                            </span>
                          )
                        })()}
                        {o.payment_proof_url && (
                          <a
                            href={o.payment_proof_url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-brand-green hover:underline"
                          >
                            📎 Proof ↗
                          </a>
                        )}
                      </div>
                      {confirmingDelete === o.id ? (
                        <span className="text-xs">
                          <span className="text-gray-500 mr-2">Delete?</span>
                          <button onClick={() => deleteOrder(o.id)} className="text-red-500 hover:underline mr-2">Yes</button>
                          <button onClick={() => setConfirmingDelete(null)} className="text-gray-500 hover:underline">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmingDelete(o.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
