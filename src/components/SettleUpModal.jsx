import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SettleUpModal({ members, onClose, onAdded }) {
  const { user } = useAuth()
  const [fromMember, setFromMember] = useState(members[0]?.id ?? '')
  const [toMember, setToMember] = useState(members[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (fromMember === toMember) { setError('From and To must be different people'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }

    setLoading(true)
    setError('')

    const { error: err } = await supabase
      .from('ledger_settlements')
      .insert({ from_member: fromMember, to_member: toMember, amount: amt, note: note.trim() || null, created_by: user?.id })
    if (err) { setError(err.message); setLoading(false); return }

    onAdded()
    onClose()
  }

  return (
    <div className="lv-overlay flex items-center justify-center z-50 p-4">
      <div className="lv-modal p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Settle Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <select
              value={fromMember}
              onChange={e => setFromMember(e.target.value)}
              className="w-full lv-input text-sm"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <select
              value={toMember}
              onChange={e => setToMember(e.target.value)}
              className="w-full lv-input text-sm"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="w-full lv-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Cash payment"
              className="w-full lv-input text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm lv-btn font-semibold disabled:opacity-40"
            >
              {loading ? 'Saving...' : 'Settle Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
