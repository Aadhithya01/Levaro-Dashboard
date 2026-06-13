import { useState } from 'react'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER

function buildMessage({ name, phone, address, landmark, locationUrl, items, total }) {
  const lines = items.map(i => {
    const codePart = i.code ? ` (${i.code})` : ''
    return `🛍️ ${i.name}${codePart} ×${i.qty} — ₹${(i.price * i.qty).toFixed(0)}`
  })
  const details = [
    `📞 Reach me at: ${phone}`,
    `📦 Send the goodies to: ${address}`,
  ]
  if (landmark) details.push(`🏠 Landmark: ${landmark}`)
  if (locationUrl) details.push(`📍 My location pin: ${locationUrl}`)

  return [
    `🎉 Woohoo! A shiny new order has landed! 🎉`,
    ``,
    `Hi LEVARO fam 👋 It's ${name} here, and my cart and I have made some *excellent* life choices today 😎`,
    ``,
    ...details,
    ``,
    `Here's the loot 👇`,
    ...lines,
    ``,
    `💰 Grand total: ₹${total.toFixed(0)} (totally worth it 🤑)`,
    ``,
    `Can't wait to flaunt these! Please confirm and let's make it happen 🙌✨`,
  ].join('\n')
}

export default function CheckoutModal({ items, total, onClose, onClear }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const numberMissing = !WHATSAPP_NUMBER

  const handlePhoneChange = (e) => {
    // digits only, max 10
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    if (phoneError) setPhoneError('')
  }

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location sharing is not supported on this device.')
      return
    }
    setGeoError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationUrl(`https://maps.google.com/?q=${latitude},${longitude}`)
        setLocating(false)
      },
      () => {
        setGeoError('Could not get your location. Please allow location access or skip it.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (numberMissing) return
    if (phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }
    const message = buildMessage({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      landmark: landmark.trim(),
      locationUrl,
      items,
      total,
    })
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    // Auto-clear the cart and close everything once the order is sent.
    onClear()
  }

  const inputStyle = { fontFamily: "'Raleway', sans-serif", fontSize: '0.9rem', color: '#1a5c45', fontWeight: 500 }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 levaro-shop"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="levaro-card-enter w-full max-w-sm bg-white overflow-y-auto shadow-2xl"
        style={{ borderRadius: '20px', animationDelay: '0s', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6">
          <div className="w-8 h-px bg-brand-gold mb-3" />

          <form onSubmit={handleSubmit}>
            <p className="levaro-display text-gray-900" style={{ fontSize: '1.3rem', fontWeight: 400, letterSpacing: '0.02em' }}>
              Your details
            </p>
            <p className="mt-1 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
              We'll send your order of {items.length} {items.length === 1 ? 'item' : 'items'} (₹{total.toFixed(0)}) to our WhatsApp.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                style={inputStyle}
              />

              <div>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Phone number (10 digits)"
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${phoneError ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-brand-green'}`}
                  style={inputStyle}
                />
                {phoneError && (
                  <p className="mt-1 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                    {phoneError}
                  </p>
                )}
              </div>

              <textarea
                required
                rows={3}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Delivery address"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green resize-none"
                style={inputStyle}
              />

              <input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="Nearby landmark (optional)"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                style={inputStyle}
              />

              {/* Location pin */}
              <button
                type="button"
                onClick={shareLocation}
                disabled={locating}
                className={`w-full rounded-xl py-2.5 border transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 ${locationUrl ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green'}`}
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem', letterSpacing: '0.05em' }}
              >
                {locating
                  ? 'Getting your location…'
                  : locationUrl
                    ? '📍 Location pinned ✓ (tap to update)'
                    : '📍 Share my location'}
              </button>
              {geoError && (
                <p className="text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                  {geoError}
                </p>
              )}
            </div>

            {numberMissing && (
              <p className="mt-3 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                Ordering is temporarily unavailable. Please try again later.
              </p>
            )}

            <button
              type="submit"
              disabled={numberMissing}
              className="mt-5 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
            >
              SEND ORDER ON WHATSAPP
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full text-gray-400 hover:text-gray-600 transition-colors"
              style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em' }}
            >
              Back to cart
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
