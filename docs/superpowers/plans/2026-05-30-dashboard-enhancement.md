# Dashboard Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four summary stat cards (Total Revenue, Total Cost, Total Profit, Items in Stock) to the top of the existing Dashboard page.

**Architecture:** Pure front-end change. The existing `useEffect` already fetches all products with purchases and sales. The stats are computed from that data in-render — no new queries.

**Tech Stack:** React 18 + Vite, Tailwind CSS v3. Brand palette: `brand-green:#1a5c45`, `brand-gold:#e8c96a`, `brand-cream:#faf7f0`, `brand-border:#e8e0d0`. File: `src/pages/Dashboard.jsx`.

---

### Task 1: Add Stat Cards to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

Current file structure (line references):
- Lines 1–6: imports
- Lines 8–35: component + useEffect (fetches products with purchases and sales)
- Lines 37–48: stockData and profitData derivations
- Lines 50–110: JSX — loading guard, then `<h1>` followed by three chart sections

- [ ] **Step 1: Read the current `src/pages/Dashboard.jsx`**

Read the file to verify the current line structure before editing.

- [ ] **Step 2: Add stat computations after line 48 (after profitData)**

Add these four lines immediately after the `profitData` computation (before the `if (loading) return ...` guard):

```jsx
const totalRevenue = products.reduce((sum, p) =>
  sum + p.sales.reduce((s, x) => s + x.quantity_sold * x.selling_price, 0), 0)
const totalCost = products.reduce((sum, p) =>
  sum + p.purchases.reduce((s, x) => s + x.quantity * x.price_per_piece, 0), 0)
const totalProfit = totalRevenue - totalCost
const totalStock = products.reduce((sum, p) =>
  sum + p.purchases.reduce((s, x) => s + x.quantity, 0)
  - p.sales.reduce((s, x) => s + x.quantity_sold, 0), 0)
```

- [ ] **Step 3: Add the stat cards grid in JSX, immediately after the `<h1>` tag**

Inside the return, after `<h1 className="text-xl font-bold text-brand-green">Dashboard</h1>`, add:

```jsx
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
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: add stat cards to dashboard"
```

---

## Verification

1. Navigate to `/dashboard`
2. Four cards appear at the top: Total Revenue, Total Cost, Total Profit, Items in Stock
3. Values match the sum of all products' purchases and sales data
4. Profit card is green-tinted when ≥ 0 and red-tinted when negative
5. Existing three charts still render correctly below the cards
6. `npm run build` passes
