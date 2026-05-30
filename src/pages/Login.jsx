import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await login(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/welcome')
    }
  }

  return (
    <div className="min-h-screen bg-brand-green flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <div className="flex flex-col items-center mb-5">
          <div className="relative w-36 h-36 flex items-center justify-center mb-3">
            {/* Outer dashed ring — revolves counter-clockwise */}
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-brand-gold/50"
              style={{ animation: 'slow-spin 5s linear infinite reverse' }}
            />
            {/* Inner solid ring — revolves clockwise */}
            <div
              className="absolute inset-3 rounded-full border border-brand-gold/30"
              style={{ animation: 'slow-spin 10s linear infinite' }}
            />
            {/* Logo — static, golden tint */}
            <img
              src="/levaro-logo.png"
              alt="Levaro"
              className="w-24 h-24 object-contain relative z-10"
              style={{
                filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(0.82) drop-shadow(0 0 8px rgba(232,201,106,0.5))',
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-brand-green tracking-widest">LEVARO</h1>
          <p className="text-gray-400 text-xs tracking-widest uppercase mt-1">Timeless Style. Refined for You.</p>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-brand-gold/30" />
          <span className="text-brand-gold/50 text-xs">✦</span>
          <div className="flex-1 h-px bg-brand-gold/30" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          {error && (
            <div className="flex flex-col items-center gap-2">
              <img src="/wrong-password.jpg" alt="" className="w-full rounded-lg object-cover" />
              <p className="text-red-500 text-xs text-center">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-brand-gold rounded py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
