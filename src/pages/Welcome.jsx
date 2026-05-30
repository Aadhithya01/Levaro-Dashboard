import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const nameMap = {
    'aadhithyaraja180@gmail.com': 'Aadhithya',
    'yuvarajthivyaa@gmail.com': 'Thivya',
    'giriarasank@gmail.com': 'Giri',
  }
  const firstName = nameMap[user?.email] ?? user?.email?.split('@')[0] ?? 'boss'

  useEffect(() => {
    const t = setTimeout(() => navigate('/'), 6000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center px-6 text-center overflow-hidden relative">

      {/* Dim watermark logo in background */}
      <img
        src="/levaro-logo.png"
        alt=""
        className="absolute inset-0 m-auto w-[80vmin] opacity-[0.04] pointer-events-none select-none"
        style={{ filter: 'invert(1)' }}
      />

      {/* Revolving logo badge at top */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-6">
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-brand-gold/50"
          style={{ animation: 'slow-spin 5s linear infinite reverse' }}
        />
        <div
          className="absolute inset-2 rounded-full border border-brand-gold/30"
          style={{ animation: 'slow-spin 10s linear infinite' }}
        />
        <img
          src="/levaro-logo.png"
          alt="Levaro"
          className="w-16 h-16 object-contain relative z-10"
          style={{
            filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(0.9) drop-shadow(0 0 6px rgba(232,201,106,0.6))',
          }}
        />
      </div>

      {/* Access granted tag */}
      <p className="text-brand-gold/60 text-xs tracking-[0.3em] uppercase mb-2">Access Granted</p>

      {/* Name */}
      <h1 className="text-4xl font-bold text-brand-gold mb-2 tracking-widest">
        Vanakkam, {firstName} 🫡
      </h1>
      <p className="text-brand-gold/60 text-sm mb-8 max-w-xs">
        The guardian of Levaro has verified your identity.<br />
        You may proceed to count the money.
      </p>

      {/* Photo card */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-3xl bg-brand-gold/20 blur-md" />
        <img
          src="/welcome.jpg"
          alt="Welcome"
          className="relative w-60 h-76 object-cover object-top rounded-2xl shadow-2xl ring-2 ring-brand-gold/40"
          style={{ height: '19rem' }}
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/')}
        className="mt-12 bg-brand-gold text-brand-green px-10 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity shadow-xl tracking-widest"
      >
        Enter Dashboard →
      </button>

      <p className="text-brand-gold/25 text-xs mt-4 tracking-widest">Auto-entering in 6s</p>
    </div>
  )
}
