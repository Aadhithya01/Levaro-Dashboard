import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ProfileDropdown({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarMessage('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarMessage('Image must be under 5 MB.'); return }
    setAvatarLoading(true)
    setAvatarMessage('')
    const path = `${user.id}/avatar`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setAvatarMessage(uploadError.message); setAvatarLoading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatar_url = `${data.publicUrl}?t=${Date.now()}`
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url } })
    setAvatarLoading(false)
    if (updateError) { setAvatarMessage(updateError.message); return }
    setAvatarMessage('Avatar updated!')
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwNew !== pwConfirm) { setPwMessage('Passwords do not match.'); return }
    if (pwNew.length < 6) { setPwMessage('Password must be at least 6 characters.'); return }
    setPwLoading(true)
    setPwMessage('')
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwLoading(false)
    if (error) { setPwMessage(error.message); return }
    setPwMessage('Password updated!')
    setPwNew('')
    setPwConfirm('')
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-brand-border z-50 overflow-hidden"
    >
      <div className="bg-brand-green/5 px-4 py-3 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-brand-gold font-bold text-sm">{initials}</span>
            }
          </div>
          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-brand-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          disabled={avatarLoading}
          className="text-xs text-brand-green hover:underline disabled:opacity-50"
        >
          {avatarLoading ? 'Uploading...' : 'Change avatar photo'}
        </button>
        {avatarMessage && (
          <p className={`text-xs mt-1 ${avatarMessage.includes('updated') ? 'text-brand-green' : 'text-red-500'}`}>
            {avatarMessage}
          </p>
        )}
      </div>

      <form onSubmit={handlePasswordChange} className="px-4 py-3 border-b border-brand-border space-y-2">
        <p className="text-xs font-medium text-gray-600">Change password</p>
        <input
          type="password"
          placeholder="New password"
          value={pwNew}
          onChange={e => setPwNew(e.target.value)}
          className="w-full border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={pwConfirm}
          onChange={e => setPwConfirm(e.target.value)}
          className="w-full border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
        {pwMessage && (
          <p className={`text-xs ${pwMessage.includes('updated') ? 'text-brand-green' : 'text-red-500'}`}>
            {pwMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={pwLoading || !pwNew || !pwConfirm}
          className="w-full bg-brand-green text-brand-gold text-xs py-1.5 rounded hover:opacity-90 disabled:opacity-40"
        >
          {pwLoading ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full px-4 py-3 text-left text-xs text-red-500 hover:bg-red-50 transition-colors"
      >
        Logout
      </button>
    </div>
  )
}
