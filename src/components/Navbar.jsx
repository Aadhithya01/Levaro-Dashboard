import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileDropdown from './ProfileDropdown'
import NavBalance from './NavBalance'
import MobileNav from './MobileNav'

export default function Navbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')
  const ledgerActive = pathname.startsWith('/ledger')
  const tasksActive = pathname.startsWith('/tasks')
  const ordersActive = pathname.startsWith('/orders')
  const custOrdersActive = pathname.startsWith('/customer-orders')
  const pricesActive = pathname.startsWith('/set-prices')

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  const links = [
    { to: '/', label: 'Categories', active: catActive },
    { to: '/dashboard', label: 'Dashboard', active: dashActive },
    { to: '/ledger', label: 'Ledger', active: ledgerActive },
    { to: '/tasks', label: 'Tasks', active: tasksActive },
    { to: '/orders', label: 'Orders', active: ordersActive },
    { to: '/customer-orders', label: 'Customer Orders', active: custOrdersActive },
    { to: '/set-prices', label: 'Set Prices', active: pricesActive },
  ]

  return (
    <nav className="lv-nav px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-gold text-lg tracking-widest" style={{ textShadow: '0 0 18px rgba(232,201,106,0.35)' }}>LEVARO</span>
        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={link.active ? 'page' : undefined}
              className={`lv-nav-link text-sm ${link.active ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NavBalance />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfile(v => !v)}
            className="w-8 h-8 rounded-full bg-brand-gold/20 hover:bg-brand-gold/30 flex items-center justify-center overflow-hidden transition-colors"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-brand-gold font-bold text-sm">{initials}</span>
            }
          </button>
          {showProfile && <ProfileDropdown onClose={() => setShowProfile(false)} />}
        </div>
      </div>
      <MobileNav />
    </nav>
  )
}
