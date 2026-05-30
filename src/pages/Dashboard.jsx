import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [salesOverTime, setSalesOverTime] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('products')
        .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price, sale_date)')
      const prods = data ?? []
      setProducts(prods)

      const byDate = {}
      prods.forEach(p => {
        p.sales.forEach(s => {
          const date = s.sale_date
          byDate[date] = (byDate[date] ?? 0) + s.quantity_sold * s.selling_price
        })
      })
      const sorted = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }))
      setSalesOverTime(sorted)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const activeProducts = products.filter(p => p.purchases.length > 0 || p.sales.length > 0)

  const stockData = activeProducts.map(p => ({
    name: p.name,
    stock: p.purchases.reduce((s, x) => s + x.quantity, 0) - p.sales.reduce((s, x) => s + x.quantity_sold, 0),
  }))

  const profitData = activeProducts.map(p => ({
    name: p.name,
    profit: parseFloat((
      p.sales.reduce((s, x) => s + x.quantity_sold * x.selling_price, 0) -
      p.purchases.reduce((s, x) => s + x.quantity * x.price_per_piece, 0)
    ).toFixed(2)),
  }))

  const totalRevenue = products.reduce((sum, p) =>
    sum + p.sales.reduce((s, x) => s + x.quantity_sold * x.selling_price, 0), 0)
  const totalCost = products.reduce((sum, p) =>
    sum + p.purchases.reduce((s, x) => s + x.quantity * x.price_per_piece, 0), 0)
  const totalProfit = totalRevenue - totalCost
  const totalStock = products.reduce((sum, p) =>
    sum + p.purchases.reduce((s, x) => s + x.quantity, 0)
    - p.sales.reduce((s, x) => s + x.quantity_sold, 0), 0)

  if (loading) return <div className="min-h-screen"><Navbar /><p className="p-8 text-gray-500 text-sm">Loading...</p></div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <h1 className="text-xl font-bold text-brand-green">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Total Revenue',
              value: `₹${totalRevenue.toFixed(2)}`,
              bg: 'bg-brand-gold/10 border-brand-gold/20',
              color: 'text-gray-800',
            },
            {
              label: 'Total Cost',
              value: `₹${totalCost.toFixed(2)}`,
              bg: 'bg-white border-brand-border',
              color: 'text-gray-800',
            },
            {
              label: 'Total Profit',
              value: `₹${totalProfit.toFixed(2)}`,
              bg: totalProfit >= 0 ? 'bg-brand-green/5 border-brand-green/20' : 'bg-red-50 border-red-200',
              color: totalProfit >= 0 ? 'text-brand-green' : 'text-red-500',
            },
            {
              label: 'Items in Stock',
              value: totalStock,
              bg: 'bg-brand-green/5 border-brand-green/20',
              color: 'text-brand-green',
            },
          ].map(({ label, value, bg, color }) => (
            <div key={label} className={`rounded-lg border ${bg} px-4 py-3`}>
              <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Stock Levels</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#1a5c45" name="Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Profit per Product (₹)</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `₹${v}`} />
                <Bar dataKey="profit" fill="#e8c96a" name="Profit (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-brand-green mb-3 uppercase tracking-widest">Sales Revenue Over Time (₹)</h2>
          <div className="bg-white rounded-lg border border-brand-border p-4">
            {salesOverTime.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No sales data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₹${v}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#1a5c45" name="Revenue (₹)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
