# Levaro Tracker — Ledger & Task List

**Date:** 2026-05-30  
**Status:** Approved

## Context

Three business partners (Aadhithya, Thivya, Giri) need to track shared expenses and settle debts between each other. They also need a shared task list with due dates. The navbar should show the current user's net balance at a glance.

---

## 1. Database Schema

### `ledger_members`
Three fixed rows seeded at migration time. No UI for adding members.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text | Aadhithya / Thivya / Giri |
| email | text UNIQUE | matches Supabase Auth email |

### `ledger_expenses`
One row per expense entry.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| description | text | e.g. "Dinner" |
| amount | numeric(10,2) | total amount paid |
| paid_by | uuid FK → ledger_members | who paid |
| created_at | timestamptz | |

### `ledger_splits`
One row per non-payer in the expense split. The payer's share is implicit.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| expense_id | uuid FK → ledger_expenses ON DELETE CASCADE | |
| member_id | uuid FK → ledger_members | the person who OWES the payer |
| amount | numeric(10,2) | their share |

### `ledger_settlements`
Records a direct payment from one member to another.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| from_member | uuid FK → ledger_members | who paid |
| to_member | uuid FK → ledger_members | who received |
| amount | numeric(10,2) | |
| note | text nullable | optional description |
| created_at | timestamptz | |

### `tasks`

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| title | text | |
| due_date | date nullable | |
| assigned_to | uuid FK → ledger_members nullable | |
| status | text | 'pending' or 'done' |
| created_at | timestamptz | |

All tables: RLS enabled, authenticated users can do everything.

---

## 2. Net Balance Formula

`netBetween(mAId, mBId)` returns a signed number:
- **positive** → A owes B that amount
- **negative** → B owes A that absolute amount
- **zero** → settled

```
net = (splits where member_id=A and expense.paid_by=B)
    - (splits where member_id=B and expense.paid_by=A)
    - (settlements where from=A and to=B)
    + (settlements where from=B and to=A)
```

---

## 3. Ledger Page (`/ledger`)

Three balance cards at top (one per pair: Aadhithya-Thivya, Aadhithya-Giri, Thivya-Giri).  
Each card: "X owes Y ₹Z" in red, or "Settled ✓" in green.

Chronological activity feed below (expenses + settlements mixed, newest first).

Two action buttons: **+ Add Expense** and **Settle Up**.

---

## 4. Add Expense Modal

Fields: Description, Amount (₹), Paid by (dropdown), Split with (toggle buttons, all 3 pre-selected).  
Shows per-person share preview as user enters amount.  
Validation: ≥ 2 people selected; amount > 0; description non-empty.  
On submit: inserts into `ledger_expenses` + `ledger_splits` (non-payer rows only, equal share).

---

## 5. Settle Up Modal

Fields: From (dropdown), To (dropdown), Amount (₹), Note (optional).  
Validation: from ≠ to; amount > 0.  
On submit: inserts into `ledger_settlements`.

---

## 6. Task List Page (`/tasks`)

Pending tasks sorted by due date ascending (no date = last). Overdue dates shown in red.  
Done tasks in a separate section below, greyed out with strikethrough.  
Circle checkbox toggles pending ↔ done.  
**+ Add Task** button.

---

## 7. Add Task Modal

Fields: Title, Due date (optional date picker), Assigned to (dropdown + "No one" option).

---

## 8. Navbar Changes

New links: **Ledger** and **Tasks** (between Dashboard and avatar).  
Balance widget left of avatar: shows current user's net balance across all pairs.
- Green `+₹X` if they're owed net
- Red `-₹X` if they owe net
- Hidden if zero or not a ledger member

---

## 9. Files Changed Summary

| File | Change |
|------|--------|
| `supabase/schema.sql` | Append migration |
| `src/lib/ledgerUtils.js` | Create — `netBetween()` utility |
| `src/pages/Ledger.jsx` | Create |
| `src/components/AddExpenseModal.jsx` | Create |
| `src/components/SettleUpModal.jsx` | Create |
| `src/pages/Tasks.jsx` | Create |
| `src/components/AddTaskModal.jsx` | Create |
| `src/components/NavBalance.jsx` | Create |
| `src/components/Navbar.jsx` | Modify — add links + NavBalance |
| `src/App.jsx` | Modify — add /ledger and /tasks routes |

---

## 10. Verification

1. `/ledger` shows 3 balance cards (all Settled ✓ initially)
2. Add Expense → 3-way split → correct pair balances update
3. Add Expense → 2-way split (uncheck one person) → correct split recorded
4. Settle Up → balance reduces correctly
5. Activity feed shows both expenses and settlements in chronological order
6. `/tasks` shows empty state with Add Task button
7. Add Task with due date + assignee → appears in pending list
8. Toggle done → moves to Done section with strikethrough
9. Overdue task (past due date, still pending) → date shown in red
10. Navbar shows balance widget that matches ledger balance
11. `npm run build` passes with no errors
