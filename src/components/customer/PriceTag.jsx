import { discountFor } from '../../lib/discount'

const RALEWAY = "'Raleway', sans-serif"
const BRAND_GREEN = '#1a5c45'
const DEAL_GOLD = '#a9791a' // readable gold for the "DEAL" badge

// Single source of truth for storefront price rendering.
// size="sm" → product tiles, size="lg" → product modal / deal cards.
// dealPrice → a REAL lower price the customer pays today (Deal of the Day). When
// present and below selling_price it wins over the cosmetic markup.
export default function PriceTag({ product, size = 'sm', dealPrice = null }) {
  const lg = size === 'lg'

  if (product?.selling_price == null) {
    return (
      <span style={{ fontFamily: RALEWAY, color: '#9ca3af', fontWeight: 400, fontSize: lg ? '0.9rem' : '0.8rem' }}>
        {lg ? 'Price on request' : 'On request'}
      </span>
    )
  }

  const price = Number(product.selling_price)
  const deal = dealPrice != null && Number(dealPrice) >= 0 && Number(dealPrice) < price
    ? Number(dealPrice)
    : null

  // Figure out the three display values. A real deal takes priority; otherwise
  // fall back to the cosmetic fake-MRP markup; otherwise just the plain price.
  let current, original, badgeText, badgeColor, badgeBg
  if (deal != null) {
    current = deal
    original = price
    badgeText = `DEAL · ${Math.round(((price - deal) / price) * 100)}% OFF`
    badgeColor = DEAL_GOLD
    badgeBg = 'rgba(169,121,26,0.13)'
  } else {
    const d = discountFor(product)
    if (!d) {
      return (
        <span style={{ fontFamily: RALEWAY, color: BRAND_GREEN, fontWeight: 600, fontSize: lg ? '1.15rem' : '0.95rem' }}>
          ₹{price.toFixed(0)}
        </span>
      )
    }
    current = price
    original = d.original
    badgeText = `${d.pct}% OFF`
    badgeColor = BRAND_GREEN
    badgeBg = 'rgba(26,92,69,0.10)'
  }

  return (
    <span className="inline-flex items-center flex-wrap gap-x-1.5 gap-y-0.5 min-w-0">
      <span style={{ fontFamily: RALEWAY, color: BRAND_GREEN, fontWeight: 600, fontSize: lg ? '1.15rem' : '0.95rem' }}>
        ₹{current.toFixed(0)}
      </span>
      <span
        className="line-through"
        style={{ fontFamily: RALEWAY, color: '#6b7280', fontWeight: 500, fontSize: lg ? '1.05rem' : '0.88rem' }}
      >
        ₹{original.toFixed(0)}
      </span>
      <span
        className="rounded"
        style={{
          fontFamily: RALEWAY,
          fontWeight: 700,
          letterSpacing: '0.04em',
          fontSize: lg ? '0.85rem' : '0.7rem',
          color: badgeColor,
          backgroundColor: badgeBg,
          padding: lg ? '3px 9px' : '2px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        {badgeText}
      </span>
    </span>
  )
}
