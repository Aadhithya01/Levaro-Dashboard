import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

function downloadCSV(rows, month) {
  const headers = ['Product', 'Sale Date', 'Qty Sold', 'Cost Price (₹)', 'Selling Price (₹)', 'Revenue (₹)', 'Payment']
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.productName.replace(/"/g, '""')}"`,
      r.saleDate,
      r.quantitySold,
      r.avgCostPrice.toFixed(2),
      r.sellingPrice.toFixed(2),
      r.revenue.toFixed(2),
      r.paymentReceived ? 'Received' : 'Pending',
    ].join(','))
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `levaro-sales-${month || 'all'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [salesOverTime, setSalesOverTime] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('products')
        .select('*, purchases(quantity, price_per_piece), sales(quantity_sold, selling_price, sale_date, payment_received)')
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

  // Flat sales list with avg cost price per product
  const allSales = products.flatMap(p => {
    const totalQty = p.purchases.reduce((s, x) => s + x.quantity, 0)
    const totalCostForProduct = p.purchases.reduce((s, x) => s + x.quantity * x.price_per_piece, 0)
    const avgCostPrice = totalQty > 0 ? totalCostForProduct / totalQty : 0
    return p.sales.map(s => ({
      productName: p.name,
      saleDate: s.sale_date,
      quantitySold: s.quantity_sold,
      sellingPrice: s.selling_price,
      avgCostPrice,
      revenue: s.quantity_sold * s.selling_price,
      paymentReceived: s.payment_received ?? true,
    }))
  }).sort((a, b) => b.saleDate.localeCompare(a.saleDate))

  const months = [...new Set(allSales.map(s => s.saleDate.slice(0, 7)))].sort().reverse()
  const activeMonth = selectedMonth || months[0] || ''
  const filteredSales = activeMonth ? allSales.filter(s => s.saleDate.startsWith(activeMonth)) : allSales

  const monthRevenue = filteredSales.reduce((sum, s) => sum + s.revenue, 0)

  if (loading) return <div className="min-h-screen"><Navbar /><p className="p-8 text-gray-500 text-sm">Loading...</p></div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <h1 className="text-xl font-bold text-brand-green">Dashboard</h1>

        {/* Sales Transactions — at top */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold text-brand-green uppercase tracking-widest">Sales Transactions</h2>
              {months.length > 0 && (
                <select
                  value={activeMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs border border-brand-border rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
                >
                  {months.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
              {filteredSales.length > 0 && (
                <span className="text-xs text-gray-400">
                  {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''} · ₹{monthRevenue.toFixed(0)} revenue
                </span>
              )}
            </div>
            {filteredSales.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCSV(filteredSales, activeMonth)}
                className="flex items-center gap-1.5 text-xs bg-brand-green text-brand-gold px-3 py-1.5 rounded hover:opacity-90 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
            )}
          </div>
          {filteredSales.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No sales for this period.</p>
          ) : (
            <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-green">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-gold font-medium">Product</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Cost Price</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Selling Price</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Revenue</th>
                    <th className="text-right px-4 py-3 text-brand-gold font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredSales.map((s, i) => (
                    <tr key={i} className="hover:bg-brand-cream">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.productName}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{s.saleDate}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{s.quantitySold}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₹{s.avgCostPrice.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{Number(s.sellingPrice).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-green">₹{s.revenue.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.paymentReceived ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {s.paymentReceived ? 'Received' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, bg: 'bg-brand-gold/10 border-brand-gold/20', color: 'text-gray-800' },
            { label: 'Total Cost', value: `₹${totalCost.toFixed(2)}`, bg: 'bg-white border-brand-border', color: 'text-gray-800' },
            { label: 'Total Profit', value: `₹${totalProfit.toFixed(2)}`, bg: totalProfit >= 0 ? 'bg-brand-green/5 border-brand-green/20' : 'bg-red-50 border-red-200', color: totalProfit >= 0 ? 'text-brand-green' : 'text-red-500' },
            { label: 'Items in Stock', value: totalStock, bg: 'bg-brand-green/5 border-brand-green/20', color: 'text-brand-green' },
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
