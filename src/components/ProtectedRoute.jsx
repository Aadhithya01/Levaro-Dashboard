import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-brand-cream">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="relative min-h-screen bg-brand-cream">
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 select-none">
        <img
          src="/levaro-logo.png"
          alt=""
          className="w-[75vw] max-h-[80vh] object-contain opacity-[0.07]"
        />
      </div>
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  )
}
