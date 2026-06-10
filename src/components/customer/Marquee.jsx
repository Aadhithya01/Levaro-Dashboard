// Scrolling italic-serif trust band on a gold-ruled strip.
const ITEMS = [
  'Premium Quality',
  'Handcrafted Pieces',
  'Authentic Designs',
  'Easy Returns',
  'Secure Packaging',
]

export default function Marquee() {
  // Rendered twice back-to-back so the -50% scroll loops seamlessly.
  const run = (key) => (
    <span key={key} className="inline-flex items-center">
      {ITEMS.map((item, i) => (
        <span key={item} className="inline-flex items-center">
          {i > 0 && <span className="mx-3 text-brand-gold/50" style={{ fontStyle: 'normal' }}>✦</span>}
          <span
            className="levaro-display text-brand-gold/60"
            style={{ fontStyle: 'italic', fontSize: '1.1rem', margin: '0 14px', whiteSpace: 'nowrap' }}
          >
            {item}
          </span>
        </span>
      ))}
      <span className="mx-3 text-brand-gold/50">✦</span>
    </span>
  )

  return (
    <div
      className="overflow-hidden py-3.5"
      style={{ borderTop: '1px solid rgba(232,201,106,0.18)', borderBottom: '1px solid rgba(232,201,106,0.18)' }}
    >
      <div className="inline-block whitespace-nowrap levaro-marquee">
        {run('a')}
        {run('b')}
      </div>
    </div>
  )
}
