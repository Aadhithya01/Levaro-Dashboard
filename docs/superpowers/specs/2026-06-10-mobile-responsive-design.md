# Mobile Responsive Redesign — Design Spec

**Date:** 2026-06-10
**Status:** Approved for planning

## Problem

The app renders correctly on desktop but breaks on phones. The admin
navbar packs five links plus a balance and avatar into one horizontal row
that overflows. Card grids are hard-locked to three columns, dashboard
stat cards to four, and the dashboard sales table has seven columns that
force horizontal scrolling. The customer storefront has the same
three-column grid problem. None of these adapt below Tailwind's `md`
breakpoint.

## Goal

Make every admin and customer page usable on a phone, **changing mobile
layout only**. Desktop (`md:` / ≥768px) must look and behave exactly as it
does today. No backend, data, or business-logic changes.

## Scope

In scope: responsive layout for all admin pages, the customer storefront,
the navbar, and modals. Out of scope: redesigning desktop, new features,
data model changes, and any non-layout behavior.

## Approach

Two kinds of change:

1. **New shared `MobileNav` component** for admin navigation. `Navbar.jsx`
   keeps its current desktop markup (shown at `md:` and up) and renders the
   mobile chrome below `md`.
2. **Tailwind responsive-prefix edits** on existing markup everywhere else.
   No logic changes, no new dependencies. Pattern: default classes target
   mobile, `md:` (or `sm:`) prefixes restore today's desktop layout.

Breakpoint convention: mobile is the unprefixed default; `md:` restores
desktop. Use `sm:` only where an intermediate step reads better (e.g.
ledger pair cards).

## Detailed Design

### 1. Admin navigation — `Navbar.jsx` + new `MobileNav`

Desktop (`md:` and up): unchanged — the current horizontal bar with five
links, `NavBalance`, and the profile avatar.

Mobile (below `md`): the horizontal link row is hidden. Two pieces render
instead:

- **Top bar (F1 layout):** brand wordmark on the left, and on the right the
  `NavBalance` pill followed by the profile avatar button (same
  `ProfileDropdown` behavior as today). Balance stays visible at a glance.
- **Floating pill nav:** a fixed, bottom-center capsule (`brand-green`
  background, rounded-full, shadow) holding five icon buttons in route
  order: Categories, Dashboard, Ledger, Tasks, Set Prices. The active route's
  icon is highlighted in `brand-gold` (matching the existing `*Active`
  pathname logic); inactive icons are `brand-gold` at reduced opacity. Icons
  are inline SVG line-icons consistent with the existing gold/green style —
  no emoji.

Each admin page adds `pb-24 md:pb-8` (or equivalent) to its content
container so the floating pill never covers the last row of content.

The active-route logic (`catActive`, `dashActive`, etc.) already exists in
`Navbar.jsx` and is reused for both desktop links and mobile pill icons.

### 2. Customer storefront

- **`CustomerShop.jsx`** category grid: `grid-cols-3` → `grid-cols-2
  md:grid-cols-3`.
- **`CustomerCategory.jsx`** product grid: `grid-cols-3` → `grid-cols-2
  md:grid-cols-3`.
- **Headers** on both pages: the large `LEVARO` display heading and tagline
  use responsive font-size / letter-spacing so they don't overflow narrow
  screens (smaller on mobile, current values at `md:`). Inline `style`
  font sizes that don't fit the phone are moved to responsive Tailwind
  classes or paired with a mobile-friendly value.
- **`TrustStrip.jsx`**: already wraps; tighten gaps if needed so it reads on
  one or two lines without crowding.
- **Floating Feedback / Suggestion buttons**
  (`FloatingFeedbackButton.jsx`, `FloatingSuggestionButton.jsx`): keep
  bottom-right placement. Labels currently appear on hover only, which never
  triggers on touch — make the buttons fully usable without the label
  (the icon alone is the control; label is desktop hover enhancement only).

### 3. Admin pages

- **`Categories.jsx`** grid: `grid-cols-3` → `grid-cols-2 md:grid-cols-3`.
  The edit/delete action buttons are `opacity-0 group-hover:opacity-100`,
  which is unreachable on touch — make them always visible on mobile
  (`opacity-100 md:opacity-0 md:group-hover:opacity-100`).
- **`Products.jsx`** grid and hover-only action buttons: same treatment as
  Categories.
- **`Dashboard.jsx`**:
  - Stat cards: `grid-cols-4` → `grid-cols-2 md:grid-cols-4` (2×2 on mobile).
  - Sales table: keep the full seven-column `<table>` at `md:` and up; below
    `md`, render the same rows as stacked cards (product name + payment badge
    on top, date · qty line, then cost/sell/revenue inline). Drives off the
    same `filteredSales` data; the table and the card list are toggled by
    `hidden md:block` / `md:hidden`.
  - Charts: keep `ResponsiveContainer`; reduce height on mobile (e.g. 200 vs
    250) if needed for readability.
  - Header row (title, month select, CSV button) already uses `flex-wrap`.
- **`Ledger.jsx`**: pair-balance grid `grid-cols-3` → `grid-cols-1
  sm:grid-cols-3`. Header action buttons (`+ Add Expense`, `Settle Up`)
  wrap on narrow screens. Feed rows verified to stack without overflow.
- **`SetPrices.jsx`**: image-card grid reflows to two columns on mobile;
  the save header/button stays reachable (wraps rather than overflows).
- **`Tasks.jsx`**: rows already use flex and stack cleanly; apply header and
  page-padding polish only.

### 4. Global polish

- Page horizontal padding: `px-6` → `px-4 md:px-6` on page content
  containers for more usable width on narrow screens.
- Modals (`Add*Modal` / `Edit*Modal` / `Delete*Modal`): add backdrop padding
  (`p-4`) so the panel never touches screen edges. They already cap at
  `max-w-sm max-h-[90vh] overflow-y-auto`, so content scrolls within the
  viewport.

## Testing

No automated test suite exists. Verification is manual via browser
responsive mode (and/or a real phone):

- Each admin page at 375px width: navbar pill reachable, active icon
  correct, no content hidden behind the pill, no horizontal scroll.
- Dashboard: stat cards 2×2, sales table shows as stacked cards, charts fit.
- Customer shop and category at 375px: two-column grids, headers don't
  overflow, floating buttons tappable.
- Every page at ≥768px: confirm layout is identical to current `master`
  (desktop regression check).
- Modals open without touching screen edges and scroll internally.

## Risks / Notes

- The dashboard sales table duplicates its row data into a mobile card
  view; both must stay in sync if columns change later. Acceptable for now;
  noted so a future column change updates both.
- Inline `style` font sizes on the customer pages need careful conversion so
  desktop values are preserved exactly.
