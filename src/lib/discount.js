// Cosmetic storefront discount — DISPLAY ONLY.
// Produces a struck-out "original" price + a stable "% OFF" for a product, so the
// real selling_price looks discounted. The cart/checkout always charge the real
// selling_price; nothing here affects what a customer actually pays.

const MIN_PCT = 25
const MAX_PCT = 45

// Deterministic 32-bit hash of a string (FNV-1a). Same id -> same number, always,
// so a product's discount never shuffles between reloads.
function hashId(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Returns { original, pct } for the discount badge, or null when there's nothing to
// show (missing/invalid price, or the rounded markup works out to < 1%).
export function discountFor(product) {
  const raw = product?.selling_price
  if (raw == null) return null
  const price = Number(raw)
  if (!Number.isFinite(price) || price <= 0) return null

  const span = MAX_PCT - MIN_PCT + 1
  const seededPct = MIN_PCT + (hashId(String(product.id ?? '')) % span) // 25..45

  // original = price grossed up by the discount, rounded UP to the nearest ₹10.
  const original = Math.ceil(price / (1 - seededPct / 100) / 10) * 10
  if (original <= price) return null

  // Recompute the shown % from the rounded original so the badge matches the numbers.
  const pct = Math.round(((original - price) / original) * 100)
  if (pct < 1) return null

  return { original, pct }
}
