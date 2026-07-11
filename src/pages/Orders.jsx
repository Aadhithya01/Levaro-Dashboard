import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddOrderModal from '../components/AddOrderModal'
import EditOrderModal from '../components/EditOrderModal'
import DeleteOrderModal from '../components/DeleteOrderModal'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Failed to fetch orders:', error); setLoading(false); return }
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="lv-page max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-brand-green">Orders</h1>
          <button onClick={() => setShowAdd(true)}
            className="lv-btn px-4 py-2 text-sm font-semibold">
            + Log Order
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No orders logged yet</p>
            <p className="text-gray-400 text-xs mb-5">Log your first vendor order to start tracking.</p>
            <button onClick={() => setShowAdd(true)}
              className="lv-btn px-4 py-2 text-sm font-semibold">
              + Log Order
            </button>
          </div>
        ) : (
          <div className="lv-card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-brand-green">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Vendor</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Phone</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty</th>
                  <th className="text-right px-4 py-3 text-brand-gold font-medium">Price (₹)</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-brand-gold font-medium">Bill</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-brand-cream">
                    <td className="px-4 py-3 text-gray-700">{o.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium text-brand-green">{o.vendor_name}</td>
                    <td className="px-4 py-3 text-gray-700">{o.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{o.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{o.order_price != null ? `₹${Number(o.order_price).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      {o.bill_url
                        ? <a href={o.bill_url} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline text-xs">View ↗</a>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(o)} className="text-xs text-brand-green hover:underline mr-3">Edit</button>
                      <button onClick={() => setDeleting(o)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onAdded={fetchOrders} />}
      {editing && <EditOrderModal order={editing} onClose={() => setEditing(null)} onUpdated={fetchOrders} />}
      {deleting && <DeleteOrderModal order={deleting} onClose={() => setDeleting(null)} onDeleted={fetchOrders} />}
    </div>
  )
}
