import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

export default function SuggestionModal({ onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    const photoUrls = []
    for (const file of photos) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('suggestion-photos')
        .upload(path, file)
      if (uploadError) { setStatus('error'); setErrorMsg('Photo upload failed. Please try again.'); return }
      const { data } = supabase.storage.from('suggestion-photos').getPublicUrl(path)
      photoUrls.push(data.publicUrl)
    }

    const { error } = await supabase.from('product_suggestions').insert({
      name: name.trim() || null,
      description: description.trim(),
      photo_urls: photoUrls,
    })
    if (error) { setStatus('error'); setErrorMsg('Something went wrong. Please try again.'); return }

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_SUGGESTION_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    if (serviceId && templateId && publicKey) {
      await emailjs.send(serviceId, templateId, {
        name: name.trim() || 'Anonymous',
        description: description.trim(),
        photo_urls: photoUrls.length ? photoUrls.join('\n') : 'No photos attached',
      }, { publicKey }).catch(() => {})
    }

    setStatus('success')
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Product Suggestion</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tell us what you're looking for.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-8 text-center">
            <p className="text-brand-green font-semibold text-sm">
              Thank you! We'll look into your suggestion.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                What are you looking for?
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the product, style, size, colour, occasion..."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Sample photos <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setPhotos(Array.from(e.target.files))}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-green/10 file:text-brand-green hover:file:bg-brand-green/20"
              />
              {photos.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-xs">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-brand-green text-brand-gold font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Suggestion'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Or email us at{' '}
              <a
                href="mailto:levaro.studiossupport@gmail.com"
                className="text-brand-green font-medium hover:underline"
              >
                levaro.studiossupport@gmail.com
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
