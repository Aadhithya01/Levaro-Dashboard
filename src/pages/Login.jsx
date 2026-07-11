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
  const [showPassword, setShowPassword] = useState(false)

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(900px 600px at 80% -10%, rgba(232,201,106,0.16), transparent 60%),' +
          'radial-gradient(800px 600px at 10% 110%, rgba(232,201,106,0.10), transparent 55%),' +
          'linear-gradient(160deg, #14503c 0%, #0f4232 55%, #0a2e22 100%)',
      }}
    >
      {/* Soft gold dot-grid, echoing the storefront canvas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #e8c96a 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        className="lv-modal p-8 w-full max-w-sm"
        style={{ background: 'rgba(255,255,255,0.94)' }}
      >
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
              className="w-full lv-input text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full lv-input pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 015.196 1.452M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v.01M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
            className="w-full lv-btn py-2 text-sm font-semibold disabled:opacity-50 tracking-wide"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
