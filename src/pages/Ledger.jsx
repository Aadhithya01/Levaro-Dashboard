import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import { netBetween } from '../lib/ledgerUtils'
import AddExpenseModal from '../components/AddExpenseModal'
import SettleUpModal from '../components/SettleUpModal'
import EditExpenseModal from '../components/EditExpenseModal'
import EditSettlementModal from '../components/EditSettlementModal'

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export default function Ledger() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExpense, setShowExpense] = useState(false)
  const [showSettle, setShowSettle] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editingSettlement, setEditingSettlement] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'expense'|'settlement', item }

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
  const me = members.find(m => m.email === user?.email)

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

  function pairColors(a, b, net) {
    const settled = Math.abs(net) < 0.01
    if (settled) return { settled: true, border: 'border-brand-border', amount: '' }
    if (!me) return { settled: false, border: 'border-red-200', amount: 'text-red-500' }
    const iAmA = me.id === a.id
    const iAmB = me.id === b.id
    // net > 0 means A owes B
    const iOwe = (iAmA && net > 0) || (iAmB && net < 0)
    if (iAmA || iAmB) {
      return iOwe
        ? { settled: false, border: 'border-red-200', amount: 'text-red-500' }
        : { settled: false, border: 'border-green-200', amount: 'text-green-600' }
    }
    return { settled: false, border: 'border-red-200', amount: 'text-red-500' }
  }

  function expenseAmountColor(item) {
    if (!me) return 'text-gray-800'
    if (item.paid_by === me.id) return 'text-green-600'
    if ((item.ledger_splits ?? []).some(s => s.member_id === me.id)) return 'text-red-500'
    return 'text-gray-800'
  }

  function settlementAmountColor(item) {
    if (!me) return 'text-green-600'
    if (item.to_member === me.id) return 'text-green-600'
    if (item.from_member === me.id) return 'text-red-500'
    return 'text-gray-500'
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return
    const { type, item } = confirmDelete
    setConfirmDelete(null)
    if (type === 'expense') {
      await supabase.from('ledger_splits').delete().eq('expense_id', item.id)
      await supabase.from('ledger_expenses').delete().eq('id', item.id)
    } else {
      await supabase.from('ledger_settlements').delete().eq('id', item.id)
    }
    fetchAll()
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {pairs.map(({ a, b }) => {
                const net = netBetween(a.id, b.id, expenses, settlements)
                const { settled, border, amount: amountColor } = pairColors(a, b, net)
                const debtor = net > 0 ? a : b
                const creditor = net > 0 ? b : a
                return (
                  <div key={`${a.id}-${b.id}`} className={`bg-white rounded-xl border p-4 ${border}`}>
                    <p className="text-xs text-gray-400 font-medium mb-2">{a.name} · {b.name}</p>
                    {settled ? (
                      <p className="text-brand-green font-semibold text-sm">Settled ✓</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">{debtor.name} owes</p>
                        <p className={`text-lg font-bold ${amountColor}`}>₹{Math.abs(net).toFixed(2)}</p>
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
                {feed.map(item => {
                  const isOwner = item.created_by === user?.id
                  return item._type === 'expense' ? (
                    <div key={item.id} className="group bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-green text-xs font-bold">₹</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.description}</p>
                        {item.notes && <p className="text-xs text-gray-500 italic mt-0.5">{item.notes}</p>}
                        <p className="text-xs text-gray-400">
                          {memberMap[item.paid_by]?.name} paid · {(item.ledger_splits?.length ?? 0) + 1}-way split
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${expenseAmountColor(item)}`}>₹{parseFloat(item.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{item.created_at?.slice(0, 10)}</p>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingExpense(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-green"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ type: 'expense', item })}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={item.id} className="group bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
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
                        <p className={`text-sm font-semibold ${settlementAmountColor(item)}`}>₹{parseFloat(item.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{item.created_at?.slice(0, 10)}</p>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingSettlement(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-green"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ type: 'settlement', item })}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
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
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          members={members}
          onClose={() => setEditingExpense(null)}
          onUpdated={fetchAll}
        />
      )}
      {editingSettlement && (
        <EditSettlementModal
          settlement={editingSettlement}
          members={members}
          onClose={() => setEditingSettlement(null)}
          onUpdated={fetchAll}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {confirmDelete.type === 'expense'
                  ? `Delete "${confirmDelete.item.description}"?`
                  : 'Delete this settlement?'}
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndDelete}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
