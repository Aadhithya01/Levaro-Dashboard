import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EditExpenseModal({ expense, members, onClose, onUpdated }) {
  const [description, setDescription] = useState(expense.description)
  const [notes, setNotes] = useState(expense.notes ?? '')
  const [amount, setAmount] = useState(String(expense.amount))
  const [paidBy, setPaidBy] = useState(expense.paid_by)
  const [splitWith, setSplitWith] = useState([
    expense.paid_by,
    ...(expense.ledger_splits ?? []).map(s => s.member_id),
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleSplit(memberId) {
    setSplitWith(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (splitWith.length < 2) { setError('Select at least 2 people to split with'); return }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('ledger_expenses')
      .update({ description: description.trim(), notes: notes.trim() || null, amount: amt, paid_by: paidBy })
      .eq('id', expense.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }

    const { error: deleteError } = await supabase
      .from('ledger_splits')
      .delete()
      .eq('expense_id', expense.id)
    if (deleteError) { setError(deleteError.message); setLoading(false); return }

    const share = parseFloat((amt / splitWith.length).toFixed(2))
    const nonPayers = splitWith.filter(id => id !== paidBy)
    if (nonPayers.length > 0) {
      const { error: splitError } = await supabase
        .from('ledger_splits')
        .insert(nonPayers.map(memberId => ({ expense_id: expense.id, member_id: memberId, amount: share })))
      if (splitError) { setError(splitError.message); setLoading(false); return }
    }

    onUpdated()
    onClose()
  }

  const parsedAmt = parseFloat(amount)
  const perPerson = !isNaN(parsedAmt) && parsedAmt > 0 && splitWith.length >= 2
    ? (parsedAmt / splitWith.length).toFixed(2)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Edit Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Purpose or reason for this expense..."
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Paid by</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Split with</label>
            <div className="flex gap-2 flex-wrap">
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleSplit(m.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    splitWith.includes(m.id)
                      ? 'bg-brand-green text-brand-gold'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {perPerson && (
              <p className="text-xs text-gray-400 mt-1.5">Each pays ₹{perPerson}</p>
            )}
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
