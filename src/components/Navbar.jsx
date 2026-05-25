import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-indigo-600 text-lg">Levaro</span>
        <Link to="/" className="text-sm text-gray-600 hover:text-indigo-600">Products</Link>
        <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-red-500"
      >
        Logout
      </button>
    </nav>
  )
}
