import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileDropdown from './ProfileDropdown'
import NavBalance from './NavBalance'

export default function Navbar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')
  const ledgerActive = pathname.startsWith('/ledger')
  const tasksActive = pathname.startsWith('/tasks')
  const pricesActive = pathname.startsWith('/set-prices')

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-brand-green px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-gold text-lg tracking-widest">LEVARO</span>
        <Link
          to="/"
          className={`text-sm transition-colors ${catActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Categories
        </Link>
        <Link
          to="/dashboard"
          className={`text-sm transition-colors ${dashActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Dashboard
        </Link>
        <Link
          to="/ledger"
          className={`text-sm transition-colors ${ledgerActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Ledger
        </Link>
        <Link
          to="/tasks"
          className={`text-sm transition-colors ${tasksActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Tasks
        </Link>
        <Link
          to="/set-prices"
          className={`text-sm transition-colors ${pricesActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
        >
          Set Prices
        </Link>
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
    </nav>
  )
}
