import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { netBetween } from '../lib/ledgerUtils'
import AddExpenseModal from '../components/AddExpenseModal'
import SettleUpModal from '../components/SettleUpModal'

export default function Ledger() {
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExpense, setShowExpense] = useState(false)
  const [showSettle, setShowSettle] = useState(false)

  async function fetchAll() {
    const [{ data: m }, { data: e }, { data: s }] = await Promise.all([
      supabase.from('ledger_members').select('*').order('name'),
      supabase.from('ledger_expenses').select('*, ledger_splits(*)').order('created_at', { ascending: false }),
      supabase.from('ledger_settlements').select('*').order('created_at', { ascending: false }),
    ])
    setMembers(m ?? [])
    setExpenses(e ?? [])
    setSettlements(s ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const aadhithya = members.find(m => m.email === 'aadhithyaraja180@gmail.com')
  const thivya = members.find(m => m.email === 'yuvarajthivyaa@gmail.com')
  const giri = members.find(m => m.email === 'giriarasank@gmail.com')
  const pairs = [
    { a: aadhithya, b: thivya },
    { a: aadhithya, b: giri },
    { a: thivya, b: giri },
  ].filter(p => p.a && p.b)

  const feed = [
    ...expenses.map(e => ({ ...e, _type: 'expense', _ts: e.created_at })),
    ...settlements.map(s => ({ ...s, _type: 'settlement', _ts: s.created_at })),
  ].sort((a, b) => b._ts.localeCompare(a._ts))

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-brand-green">Ledger</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExpense(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Expense
            </button>
            <button
              onClick={() => setShowSettle(true)}
              className="border border-brand-green text-brand-green px-4 py-2 rounded text-sm font-semibold hover:bg-brand-green/5"
            >
              Settle Up
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {pairs.map(({ a, b }) => {
                const net = netBetween(a.id, b.id, expenses, settlements)
                const settled = Math.abs(net) < 0.01
                const debtor = net > 0 ? a : b
                const creditor = net > 0 ? b : a
                return (
                  <div
                    key={`${a.id}-${b.id}`}
                    className={`bg-white rounded-xl border p-4 ${settled ? 'border-brand-border' : 'border-red-200'}`}
                  >
                    <p className="text-xs text-gray-400 font-medium mb-2">{a.name} · {b.name}</p>
                    {settled ? (
                      <p className="text-brand-green font-semibold text-sm">Settled ✓</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">{debtor.name} owes</p>
                        <p className="text-lg font-bold text-red-500">₹{Math.abs(net).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">to {creditor.name}</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {feed.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No transactions yet. Add an expense to get started.</p>
            ) : (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-3">Activity</h2>
                {feed.map(item =>
                  item._type === 'expense' ? (
                    <div key={item.id} className="bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-green text-xs font-bold">₹</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.description}</p>
                        <p className="text-xs text-gray-400">
                          {memberMap[item.paid_by]?.name} paid · {(item.ledger_splits?.length ?? 0) + 1}-way split
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800">₹{parseFloat(item.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{item.created_at?.slice(0, 10)}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {memberMap[item.from_member]?.name} settled with {memberMap[item.to_member]?.name}
                        </p>
                        {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-green-600">₹{parseFloat(item.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{item.created_at?.slice(0, 10)}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showExpense && (
        <AddExpenseModal members={members} onClose={() => setShowExpense(false)} onAdded={fetchAll} />
      )}
      {showSettle && (
        <SettleUpModal members={members} onClose={() => setShowSettle(false)} onAdded={fetchAll} />
      )}
    </div>
  )
}
