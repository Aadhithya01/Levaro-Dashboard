import { useState } from 'react'
import { useCart } from '../../contexts/CartContext'
import CheckoutModal from './CheckoutModal'

export default function CartDrawer() {
  const { items, total, isOpen, closeCart, setQty, removeItem, clear, toast } = useCart()
  const [checkingOut, setCheckingOut] = useState(false)

  return (
    <>
      {/* Transient "added to cart" toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] levaro-shop pointer-events-none">
          <div
            className="levaro-card-enter flex items-center gap-2 bg-brand-green text-brand-gold rounded-full px-4 py-2 shadow-lg"
            style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.78rem', letterSpacing: '0.04em', fontWeight: 600 }}
          >
            <span>✓</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 transition-opacity duration-300 levaro-shop ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-brand-cream flex flex-col levaro-shop transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-12px 0 40px rgba(0,0,0,0.25)' }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(26,92,69,0.12)' }}>
          <span className="levaro-display text-brand-green uppercase" style={{ fontSize: '0.95rem', letterSpacing: '0.22em', fontWeight: 500 }}>
            Your Cart
          </span>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="text-gray-400 hover:text-gray-700 transition-colors"
            style={{ fontSize: '1.1rem' }}
          >✕</button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-16" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.9rem' }}>
              Your cart is empty.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map(item => (
                <li key={item.id} className="flex gap-3">
                  <div className="w-16 h-20 flex-shrink-0 rounded-md overflow-hidden bg-brand-green/10">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center levaro-display text-brand-green/30" style={{ fontSize: '1.5rem' }}>{item.name.charAt(0).toUpperCase()}</div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="levaro-display text-gray-800 truncate" style={{ fontSize: '1rem', fontWeight: 500 }}>{item.name}</p>
                    {item.code && (
                      <p className="truncate" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.66rem', color: '#9ca3af' }}>{item.code}</p>
                    )}
                    <p className="mt-0.5 font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.82rem', color: '#1a5c45' }}>
                      ₹{(item.price * item.qty).toFixed(0)}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-brand-green/25 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty - 1)}
                          aria-label="Decrease quantity"
                          className="px-2 py-0.5 text-brand-green hover:bg-brand-green/10 transition-colors"
                        >−</button>
                        <span className="px-2.5 text-gray-700" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', fontWeight: 600 }}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty + 1)}
                          aria-label="Increase quantity"
                          className="px-2 py-0.5 text-brand-green hover:bg-brand-green/10 transition-colors"
                        >+</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem', letterSpacing: '0.05em' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(26,92,69,0.12)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 uppercase" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.1em' }}>Total</span>
              <span className="levaro-display text-brand-green" style={{ fontSize: '1.3rem', fontWeight: 600 }}>₹{total.toFixed(0)}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckingOut(true)}
              className="w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
            >
              CHECKOUT
            </button>
          </div>
        )}
      </aside>

      {checkingOut && (
        <CheckoutModal
          items={items}
          total={total}
          onClose={() => setCheckingOut(false)}
          onClear={() => { clear(); setCheckingOut(false); closeCart() }}
        />
      )}
    </>
  )
}
