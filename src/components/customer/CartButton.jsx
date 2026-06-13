import { useCart } from '../../contexts/CartContext'

export default function CartButton() {
  const { count, openCart } = useCart()

  return (
    <button
      type="button"
      onClick={openCart}
      data-hover
      aria-label="Open cart"
      className="relative text-brand-gold/70 hover:text-brand-gold transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25h9.59c.69 0 1.293-.47 1.456-1.142l1.357-5.428a.75.75 0 00-.728-.93H5.106M7.5 14.25L5.106 6.75M7.5 14.25L6.2 17.1a.75.75 0 00.681 1.065h10.119M8.25 21a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-brand-gold text-brand-green font-bold"
          style={{ minWidth: '1.05rem', height: '1.05rem', fontSize: '0.6rem', padding: '0 0.2rem', lineHeight: 1 }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
