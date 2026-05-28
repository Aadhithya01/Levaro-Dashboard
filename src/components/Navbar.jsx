import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const catActive = pathname === '/' || pathname.startsWith('/categories') || pathname.startsWith('/products')
  const dashActive = pathname.startsWith('/dashboard')

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
      </div>
      <button onClick={handleLogout} className="text-sm text-brand-gold/50 hover:text-brand-gold/80">
        Logout
      </button>
    </nav>
  )
}
