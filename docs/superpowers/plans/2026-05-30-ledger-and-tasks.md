# Ledger & Task List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared expense ledger (Splitwise-style), a task list, and a navbar balance widget to the Levaro Tracker app.

**Architecture:** Five new DB tables seeded with 3 fixed members. A pure-JS utility computes net balances per pair. The Ledger and Tasks pages are standalone; a NavBalance component fetches its own data independently. No global state — each component owns its fetches.

**Tech Stack:** React 18 + Vite, Supabase (PostgreSQL + JS client), Tailwind CSS v3, React Router v6. Project at `C:\Users\aadhi\Documents\Projects\levaro-tracker`. Brand palette: `brand-green:#1a5c45`, `brand-gold:#e8c96a`, `brand-cream:#faf7f0`, `brand-border:#e8e0d0`.

---

## File Map

| File | Action |
|------|--------|
| `supabase/schema.sql` | Append migration block |
| `src/lib/ledgerUtils.js` | Create |
| `src/pages/Ledger.jsx` | Create |
| `src/components/AddExpenseModal.jsx` | Create |
| `src/components/SettleUpModal.jsx` | Create |
| `src/pages/Tasks.jsx` | Create |
| `src/components/AddTaskModal.jsx` | Create |
| `src/components/NavBalance.jsx` | Create |
| `src/components/Navbar.jsx` | Modify |
| `src/App.jsx` | Modify |

---

### Task 1: DB Migration

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Append the migration to `supabase/schema.sql`**

Open `supabase/schema.sql` and append this block at the end:

```sql
-- Migration: add_ledger_and_tasks (2026-05-30)
CREATE TABLE ledger_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL
);

CREATE TABLE ledger_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_by uuid REFERENCES ledger_members(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ledger_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid REFERENCES ledger_expenses(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES ledger_members(id) NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE ledger_settlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_member uuid REFERENCES ledger_members(id) NOT NULL,
  to_member uuid REFERENCES ledger_members(id) NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  due_date date,
  assigned_to uuid REFERENCES ledger_members(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ledger_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access on ledger_members"
  ON ledger_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_expenses"
  ON ledger_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_splits"
  ON ledger_splits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_settlements"
  ON ledger_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on tasks"
  ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO ledger_members (name, email) VALUES
  ('Aadhithya', 'aadhithyaraja180@gmail.com'),
  ('Thivya', 'yuvarajthivyaa@gmail.com'),
  ('Giri', 'giriarasank@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `cergignhfwrkxgamzfwd`
- `name`: `add_ledger_and_tasks`
- `query`: the SQL block from Step 1

Expected: migration applies successfully with no errors.

- [ ] **Step 3: Verify tables exist**

Use `mcp__claude_ai_Supabase__list_tables` (project_id: `cergignhfwrkxgamzfwd`) and confirm all 5 new tables appear: `ledger_members`, `ledger_expenses`, `ledger_splits`, `ledger_settlements`, `tasks`.

- [ ] **Step 4: Verify member seed**

Use `mcp__claude_ai_Supabase__execute_sql` with query:
```sql
SELECT name, email FROM ledger_members ORDER BY name;
```

Expected output: 3 rows — Aadhithya, Giri, Thivya.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add ledger and tasks DB schema"
```

---

### Task 2: Balance Utility

**Files:**
- Create: `src/lib/ledgerUtils.js`

- [ ] **Step 1: Create `src/lib/ledgerUtils.js`**

```javascript
export function netBetween(mAId, mBId, expenses, settlements) {
  let aOwesB = 0
  let bOwesA = 0
  for (const exp of expenses) {
    if (exp.paid_by === mBId) {
      const split = (exp.ledger_splits ?? []).find(s => s.member_id === mAId)
      if (split) aOwesB += parseFloat(split.amount)
    }
    if (exp.paid_by === mAId) {
      const split = (exp.ledger_splits ?? []).find(s => s.member_id === mBId)
      if (split) bOwesA += parseFloat(split.amount)
    }
  }
  const aSettledB = settlements
    .filter(s => s.from_member === mAId && s.to_member === mBId)
    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
  const bSettledA = settlements
    .filter(s => s.from_member === mBId && s.to_member === mAId)
    .reduce((sum, s) => sum + parseFloat(s.amount), 0)
  return aOwesB - bOwesA - aSettledB + bSettledA
}
```

The return value is signed: positive = A owes B, negative = B owes A, zero = settled.

- [ ] **Step 2: Commit**

```bash
git add src/lib/ledgerUtils.js
git commit -m "feat: add netBetween ledger utility"
```

---

### Task 3: Ledger Page

**Files:**
- Create: `src/pages/Ledger.jsx`

- [ ] **Step 1: Create `src/pages/Ledger.jsx`**

```jsx
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds (AddExpenseModal and SettleUpModal don't exist yet, so this will fail — that's expected. Skip this step and continue to Tasks 4 and 5 first, then re-run build after Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/Ledger.jsx
git commit -m "feat: add Ledger page with balance cards and feed"
```

---

### Task 4: AddExpenseModal

**Files:**
- Create: `src/components/AddExpenseModal.jsx`

- [ ] **Step 1: Create `src/components/AddExpenseModal.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddExpenseModal({ members, onClose, onAdded }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? '')
  const [splitWith, setSplitWith] = useState(members.map(m => m.id))
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

    const { data: exp, error: expError } = await supabase
      .from('ledger_expenses')
      .insert({ description: description.trim(), amount: amt, paid_by: paidBy })
      .select()
      .single()
    if (expError) { setError(expError.message); setLoading(false); return }

    const share = parseFloat((amt / splitWith.length).toFixed(2))
    const nonPayers = splitWith.filter(id => id !== paidBy)
    if (nonPayers.length > 0) {
      const { error: splitError } = await supabase
        .from('ledger_splits')
        .insert(nonPayers.map(memberId => ({ expense_id: exp.id, member_id: memberId, amount: share })))
      if (splitError) { setError(splitError.message); setLoading(false); return }
    }

    onAdded()
    onClose()
  }

  const parsedAmt = parseFloat(amount)
  const perPerson = !isNaN(parsedAmt) && parsedAmt > 0 && splitWith.length >= 2
    ? (parsedAmt / splitWith.length).toFixed(2)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Dinner"
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
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
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AddExpenseModal.jsx
git commit -m "feat: add AddExpenseModal"
```

---

### Task 5: SettleUpModal

**Files:**
- Create: `src/components/SettleUpModal.jsx`

- [ ] **Step 1: Create `src/components/SettleUpModal.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SettleUpModal({ members, onClose, onAdded }) {
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
      .insert({ from_member: fromMember, to_member: toMember, amount: amt, note: note.trim() || null })
    if (err) { setError(err.message); setLoading(false); return }

    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Settle Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <select
              value={fromMember}
              onChange={e => setFromMember(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <select
              value={toMember}
              onChange={e => setToMember(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
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
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Cash payment"
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
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
              className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'Saving...' : 'Settle Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettleUpModal.jsx
git commit -m "feat: add SettleUpModal"
```

---

### Task 6: Tasks Page

**Files:**
- Create: `src/pages/Tasks.jsx`

- [ ] **Step 1: Create `src/pages/Tasks.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AddTaskModal from '../components/AddTaskModal'

function TaskRow({ task, memberMap, today, onToggle }) {
  const overdue = task.due_date && task.due_date < today && task.status === 'pending'
  const assignee = task.assigned_to ? memberMap[task.assigned_to] : null
  return (
    <div className="bg-white rounded-lg border border-brand-border px-4 py-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.status === 'done'
            ? 'border-brand-green bg-brand-green'
            : 'border-gray-300 hover:border-brand-green'
        }`}
      >
        {task.status === 'done' && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {task.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {overdue ? 'Overdue · ' : ''}{task.due_date}
            </span>
          )}
          {assignee && (
            <span className="text-xs text-gray-400">{task.due_date ? '·' : ''} {assignee.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchAll() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('ledger_members').select('*').order('name'),
    ])
    setTasks(t ?? [])
    setMembers(m ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function toggleTask(task) {
    const newStatus = task.status === 'pending' ? 'done' : 'pending'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const today = new Date().toISOString().slice(0, 10)
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const pending = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div className="min-h-screen bg-brand-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-brand-green">Tasks</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
          >
            + Add Task
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : pending.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-600 text-sm font-medium mb-1">No tasks yet</p>
            <p className="text-gray-400 text-xs mb-5">Add tasks to track what needs to be done</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-green text-brand-gold px-4 py-2 rounded text-sm font-semibold hover:opacity-90"
            >
              + Add Task
            </button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2 mb-6">
                <h2 className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-3">Pending</h2>
                {pending.map(t => (
                  <TaskRow key={t.id} task={t} memberMap={memberMap} today={today} onToggle={toggleTask} />
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Done</h2>
                {done.map(t => (
                  <TaskRow key={t.id} task={t} memberMap={memberMap} today={today} onToggle={toggleTask} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddTaskModal members={members} onClose={() => setShowModal(false)} onAdded={fetchAll} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Tasks.jsx
git commit -m "feat: add Tasks page"
```

---

### Task 7: AddTaskModal

**Files:**
- Create: `src/components/AddTaskModal.jsx`

- [ ] **Step 1: Create `src/components/AddTaskModal.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AddTaskModal({ members, onClose, onAdded }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('tasks').insert({
      title: title.trim(),
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    })
    if (err) { setError(err.message); setLoading(false); return }

    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Add Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Restock inventory"
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assigned to (optional)</label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
            >
              <option value="">No one</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
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
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AddTaskModal.jsx
git commit -m "feat: add AddTaskModal"
```

---

### Task 8: NavBalance Component

**Files:**
- Create: `src/components/NavBalance.jsx`

- [ ] **Step 1: Create `src/components/NavBalance.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { netBetween } from '../lib/ledgerUtils'

export default function NavBalance() {
  const { user } = useAuth()
  const [net, setNet] = useState(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: members }, { data: expenses }, { data: settlements }] = await Promise.all([
        supabase.from('ledger_members').select('*'),
        supabase.from('ledger_expenses').select('*, ledger_splits(*)'),
        supabase.from('ledger_settlements').select('*'),
      ])
      if (!members || !expenses || !settlements) return
      const me = members.find(m => m.email === user.email)
      if (!me) return
      const others = members.filter(m => m.id !== me.id)
      const total = others.reduce((sum, o) => sum + netBetween(me.id, o.id, expenses, settlements), 0)
      setNet(total)
    }
    load()
  }, [user])

  if (net === null || Math.abs(net) < 0.01) return null
  const isOwing = net > 0
  return (
    <span className={`text-xs font-semibold tabular-nums ${isOwing ? 'text-red-300' : 'text-green-300'}`}>
      {isOwing ? `-₹${Math.abs(net).toFixed(0)}` : `+₹${Math.abs(net).toFixed(0)}`}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NavBalance.jsx
git commit -m "feat: add NavBalance widget"
```

---

### Task 9: Update Navbar + App Routes

**Files:**
- Modify: `src/components/Navbar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `src/components/Navbar.jsx`**

```jsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileDropdown from './ProfileDropdown'
import NavBalance from './NavBalance'

export default function Navbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')
  const ledgerActive = pathname.startsWith('/ledger')
  const tasksActive = pathname.startsWith('/tasks')

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-brand-green px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-gold text-lg tracking-widest">LEVARO</span>
        <Link
          to="/"
          className={`text-sm transition-colors ${catActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Categories
        </Link>
        <Link
          to="/dashboard"
          className={`text-sm transition-colors ${dashActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Dashboard
        </Link>
        <Link
          to="/ledger"
          className={`text-sm transition-colors ${ledgerActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Ledger
        </Link>
        <Link
          to="/tasks"
          className={`text-sm transition-colors ${tasksActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Tasks
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <NavBalance />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfile(v => !v)}
            className="w-8 h-8 rounded-full bg-brand-gold/20 hover:bg-brand-gold/30 flex items-center justify-center overflow-hidden transition-colors"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-brand-gold font-bold text-sm">{initials}</span>
            }
          </button>
          {showProfile && <ProfileDropdown onClose={() => setShowProfile(false)} />}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Replace `src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Categories from './pages/Categories'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Dashboard from './pages/Dashboard'
import Ledger from './pages/Ledger'
import Tasks from './pages/Tasks'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/categories/:categoryId" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.jsx src/App.jsx
git commit -m "feat: add Ledger and Tasks routes, navbar links, NavBalance widget"
```

---

## Verification Checklist

After all tasks complete, confirm manually:

1. `/ledger` loads — 3 balance cards show "Settled ✓"
2. Add Expense (3-way split ₹300) → Aadhithya-Thivya card shows "₹100 owed"
3. Add Expense (2-way: uncheck Giri) → only the 2-person pair updates
4. Settle Up → balance card reduces correctly
5. Activity feed shows both expenses and settlements newest-first
6. `/tasks` loads with empty state
7. Add Task with due date + assignee → appears in Pending, sorted by due date
8. Click circle → task moves to Done with strikethrough
9. Task with past due date and pending status → date shown in red
10. Navbar shows Ledger + Tasks links; balance widget appears if non-zero balance
11. `npm run build` passes
