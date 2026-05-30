# Levaro Tracker — Dashboard Enhancement

**Date:** 2026-05-30  
**Status:** Approved

## Context

The existing Dashboard page shows three charts but no summary numbers. Adding four stat cards at the top gives users an instant overview without reading charts.

---

## Stat Cards

Four cards in a row above the existing charts, all computed from already-fetched `products` data:

| Card | Value | Style |
|------|-------|-------|
| Total Revenue | sum of all (quantity_sold × selling_price) | gold tint |
| Total Cost | sum of all (quantity × price_per_piece) | neutral white |
| Total Profit | Revenue − Cost | green tint if ≥ 0, red tint if negative |
| Items in Stock | sum of all (purchased − sold) | green tint |

No new DB queries. The existing `useEffect` already fetches products with all purchases and sales.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.jsx` | Add 4 stat cards between `<h1>` and first chart |

---

## Verification

1. Dashboard shows 4 stat cards at top with correct numbers
2. Profit card is green tint when profit ≥ 0, red tint when negative
3. `npm run build` passes
