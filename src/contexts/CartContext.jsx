import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'levaro_cart'

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage unavailable (private mode etc.) — cart just won't persist
    }
  }, [items])

  // product: { id, name, code, price, image }
  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        code: product.code ?? null,
        price: Number(product.price),
        image: product.image ?? null,
        qty: 1,
      }]
    })
  }

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const setQty = (id, qty) => {
    const n = Math.max(0, Math.floor(qty))
    setItems(prev =>
      n === 0
        ? prev.filter(i => i.id !== id)
        : prev.map(i => i.id === id ? { ...i, qty: n } : i)
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
