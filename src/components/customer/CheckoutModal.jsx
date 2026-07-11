import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import upiQr from '../../assets/upi-qr.png'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER
const UPI_ID = 'aadhithyaraja180-2@oksbi'
const ALLOWED_PROOF_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic']

function buildMessage({ name, phone, address, landmark, locationUrl, items, total, paymentMethod, hasProof }) {
  const orderLines = items.map((i, idx) => {
    const codePart = i.code ? ` (${i.code})` : ''
    const colorPart = i.color ? ` — ${i.color}` : ''
    return `${idx + 1}. ${i.name}${codePart}${colorPart} — Qty: ${i.qty} — ₹${(i.price * i.qty).toFixed(0)}`
  })

  const details = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Delivery address: ${address}`,
  ]
  if (landmark) details.push(`Landmark: ${landmark}`)
  if (locationUrl) details.push(`Location: ${locationUrl}`)

  const paymentLine = paymentMethod === 'upi'
    ? `Payment: Paid via UPI${hasProof ? ' (screenshot uploaded)' : ''}`
    : `Payment: Cash on Delivery`
  details.push(paymentLine)

  return [
    `Hello LEVARO team,`,
    ``,
    `I would like to place the following order:`,
    ``,
    ...details,
    ``,
    `Order summary:`,
    ...orderLines,
    ``,
    `Total: ₹${total.toFixed(0)}`,
    ``,
    `Please confirm availability and the delivery timeline. Thank you.`,
  ].join('\n')
}

export default function CheckoutModal({ items, total, onClose, onClear }) {
  const [step, setStep] = useState('details') // 'details' | 'payment'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [method, setMethod] = useState('upi') // 'upi' | 'cod'

  const [proof, setProof] = useState(null)   // { url, path } | null
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const fileRef = useRef(null)
  const sendingRef = useRef(false) // synchronous double-submit guard

  // Revoke the preview object URL whenever it changes or the modal unmounts,
  // so closing the modal with a screenshot attached doesn't leak the blob.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const handleProofFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image too large (max 5 MB).'); return }

    setUploading(true)
    try {
      const rawExt = (file.name.split('.').pop() || '').toLowerCase()
      const ext = ALLOWED_PROOF_EXT.includes(rawExt) ? rawExt : 'jpg'
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, file)
      if (upErr) { setUploadError(upErr.message); return }
      const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
      setProof({ url: data.publicUrl, path })
      setPreviewUrl(URL.createObjectURL(file))
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Anon (storefront) has INSERT-only access to payment-proofs and cannot
  // delete objects, so we don't attempt a storage remove here — a screenshot
  // removed before submitting is simply left unreferenced. Clear local state
  // only; the previewUrl effect revokes the blob.
  const removeProof = () => {
    setProof(null)
    setPreviewUrl('')
    setUploadError('')
  }

  const numberMissing = !WHATSAPP_NUMBER

  const handlePhoneChange = (e) => {
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

  // Details step submit → advance to payment step (no logging/WhatsApp yet).
  const handleDetailsSubmit = (e) => {
    e.preventDefault()
    if (numberMissing) return
    if (phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }
    setStep('payment')
  }

  // Final handoff: log order (fire-and-forget) + open WhatsApp + clear cart.
  const handleSend = () => {
    if (numberMissing) return
    if (sendingRef.current) return // guard against a fast double-click → duplicate orders
    sendingRef.current = true
    const paymentStatus = method === 'upi' ? 'claimed' : 'unpaid'
    // Only a UPI order carries a payment proof — never attach one to COD.
    const orderProof = method === 'upi' ? proof : null

    supabase
      .from('customer_orders')
      .insert({
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim() || null,
        location_url: locationUrl || null,
        items: items.map(i => ({
          product_id: i.id,
          name: i.name,
          code: i.code ?? null,
          color: i.color ?? null,
          variant_id: i.variantId ?? null,
          qty: i.qty,
          price: i.price,
        })),
        total,
        payment_method: method,
        payment_status: paymentStatus,
        payment_proof_url: orderProof?.url ?? null,
        payment_proof_path: orderProof?.path ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log customer order:', error)
      })

    const message = buildMessage({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      landmark: landmark.trim(),
      locationUrl,
      items,
      total,
      paymentMethod: method,
      hasProof: !!orderProof,
    })
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onClear()
  }

  const inputStyle = { fontFamily: "'Raleway', sans-serif", fontSize: '0.9rem', color: '#1a5c45', fontWeight: 500 }
  const labelStyle = { fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem', letterSpacing: '0.05em' }

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

          {step === 'details' ? (
            <form onSubmit={handleDetailsSubmit}>
              <p className="levaro-display text-gray-900" style={{ fontSize: '1.3rem', fontWeight: 400, letterSpacing: '0.02em' }}>
                Your details
              </p>
              <p className="mt-1 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                {items.length} {items.length === 1 ? 'item' : 'items'} · ₹{total.toFixed(0)}. Next you'll choose how to pay.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                  style={inputStyle}
                />

                <div>
                  <input
                    type="tel" required inputMode="numeric" maxLength={10} value={phone}
                    onChange={handlePhoneChange} placeholder="Phone number (10 digits)"
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
                  required rows={3} value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green resize-none"
                  style={inputStyle}
                />

                <input
                  type="text" value={landmark} onChange={e => setLandmark(e.target.value)}
                  placeholder="Nearby landmark (optional)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-green"
                  style={inputStyle}
                />

                <button
                  type="button" onClick={shareLocation} disabled={locating}
                  className={`w-full rounded-xl py-2.5 border transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 ${locationUrl ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-300 text-gray-600 hover:border-brand-green hover:text-brand-green'}`}
                  style={labelStyle}
                >
                  {locating ? 'Getting your location…' : locationUrl ? '📍 Location pinned ✓ (tap to update)' : '📍 Share my location (optional)'}
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
                type="submit" disabled={numberMissing}
                className="mt-5 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
              >
                CONTINUE TO PAYMENT
              </button>
              <button
                type="button" onClick={onClose}
                className="mt-2 w-full text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em' }}
              >
                Back to cart
              </button>
            </form>
          ) : (
            <div>
              <p className="levaro-display text-gray-900" style={{ fontSize: '1.3rem', fontWeight: 400, letterSpacing: '0.02em' }}>
                Payment
              </p>
              <p className="mt-1 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                Total payable: ₹{total.toFixed(0)}
              </p>

              {/* Method selector */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[{ key: 'upi', label: 'Pay via UPI' }, { key: 'cod', label: 'Cash on Delivery' }].map(m => (
                  <button
                    key={m.key} type="button" onClick={() => setMethod(m.key)}
                    className={`rounded-xl py-2.5 border transition-colors font-semibold ${method === m.key ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-gray-200 text-gray-600 hover:border-brand-green'}`}
                    style={labelStyle}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* UPI panel */}
              {method === 'upi' && (
                <div className="mt-4 flex flex-col items-center text-center">
                  <img src={upiQr} alt="UPI QR code" className="w-52 h-52 object-contain rounded-xl border border-gray-100" />
                  <p className="mt-2 text-gray-900 font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '1.05rem' }}>
                    Pay ₹{total.toFixed(0)}
                  </p>
                  <p className="text-gray-500 select-all" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                    UPI ID: {UPI_ID}
                  </p>
                  <p className="mt-1 text-gray-400" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                    Scan, enter the amount, and pay. If your app allows a screenshot you can attach it below; otherwise just share the receipt on WhatsApp.
                  </p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProofFile} />
                  {proof ? (
                    <div className="mt-3 relative inline-flex items-center gap-2 border border-brand-green rounded-lg p-2">
                      <img src={previewUrl} alt="Payment screenshot" className="w-14 h-14 object-cover rounded" />
                      <span className="text-brand-green font-semibold" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem' }}>
                        Screenshot attached ✓
                      </span>
                      <button
                        type="button" onClick={removeProof}
                        className="bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-500"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button" onClick={() => fileRef.current.click()} disabled={uploading}
                      className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-xl py-2.5 text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors disabled:opacity-60"
                      style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.04em' }}
                    >
                      {uploading ? 'Uploading…' : '📎 Upload payment screenshot (optional)'}
                    </button>
                  )}
                  {uploadError && (
                    <p className="mt-1 text-red-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.68rem' }}>
                      {uploadError}
                    </p>
                  )}
                </div>
              )}

              {method === 'cod' && (
                <p className="mt-4 text-gray-500" style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.75rem' }}>
                  Pay in cash when your order is delivered. We'll confirm the details on WhatsApp.
                </p>
              )}

              <button
                type="button" onClick={handleSend} disabled={numberMissing}
                className="mt-5 w-full bg-brand-green text-brand-gold rounded-xl py-3 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.8rem', letterSpacing: '0.12em' }}
              >
                {method === 'upi' ? "I'VE PAID — SEND ORDER ON WHATSAPP" : 'PLACE ORDER ON WHATSAPP'}
              </button>
              <button
                type="button" onClick={() => setStep('details')}
                className="mt-2 w-full text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em' }}
              >
                Back to details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
