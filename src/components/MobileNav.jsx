import { Link, useLocation } from 'react-router-dom'

const items = [
  {
    to: '/',
    label: 'Categories',
    isActive: p => p === '/' || p.startsWith('/categories') || p.startsWith('/products'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    isActive: p => p.startsWith('/dashboard'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a1 1 0 00-1-1H5a1 1 0 00-1 1v6a1 1 0 001 1h3a1 1 0 001-1zm0 0V9a1 1 0 011-1h4a1 1 0 011 1v10m-6 0a1 1 0 001 1h4a1 1 0 001-1m0 0V5a1 1 0 011-1h3a1 1 0 011 1v14a1 1 0 01-1 1h-3a1 1 0 01-1-1z" />
    ),
  },
  {
    to: '/ledger',
    label: 'Ledger',
    isActive: p => p.startsWith('/ledger'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    isActive: p => p.startsWith('/tasks'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    to: '/set-prices',
    label: 'Set Prices',
    isActive: p => p.startsWith('/set-prices'),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 014 12V7a4 4 0 014-4z" />
    ),
  },
]

export default function MobileNav() {
  const { pathname } = useLocation()

  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 bg-brand-green rounded-full px-2 py-2 shadow-lg shadow-brand-green/30">
        {items.map(item => {
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                active ? 'bg-brand-gold/20 text-brand-gold' : 'text-brand-gold/55 hover:text-brand-gold'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
