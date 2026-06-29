import { createContext, useContext, useEffect, useRef, useState } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'levaro_cart'

export function cartLineKey(item) {
  return `${item.id}::${item.color ?? ''}`
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored)
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage unavailable (private mode etc.) — cart just won't persist
    }
  }, [items])

  // product: { id, name, code, price, image, color?, variantId? }
  const addItem = (product) => {
    const key = cartLineKey(product)
    setItems(prev => {
      const existing = prev.find(i => cartLineKey(i) === key)
      if (existing) {
        return prev.map(i => cartLineKey(i) === key ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        code: product.code ?? null,
        price: Number(product.price),
        image: product.image ?? null,
        color: product.color ?? null,
        variantId: product.variantId ?? null,
        qty: 1,
      }]
    })
    showToast('Added to cart')
  }

  const removeItem = (key) => setItems(prev => prev.filter(i => cartLineKey(i) !== key))

  const setQty = (key, qty) => {
    const n = Math.max(0, Math.floor(qty))
    setItems(prev =>
      n === 0
        ? prev.filter(i => cartLineKey(i) !== key)
        : prev.map(i => cartLineKey(i) === key ? { ...i, qty: n } : i)
    )
  }

  const clear = () => setItems([])

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  const count = items.reduce((sum, i) => sum + i.qty, 0)
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const has = (id) => items.some(i => i.id === id)

  return (
    <CartContext.Provider value={{
      items, count, total, has,
      addItem, removeItem, setQty, clear,
      isOpen, openCart, closeCart,
      toast,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
