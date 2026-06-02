import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

export default function FeedbackModal({ onClose }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('submitting')

    const { error } = await supabase
      .from('site_feedback')
      .insert({ name: name.trim() || null, message: message.trim() })

    if (error) { setStatus('error'); return }

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_FEEDBACK_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (serviceId && templateId && publicKey) {
      await emailjs
        .send(serviceId, templateId, { name: name.trim() || 'Anonymous', message: message.trim() }, { publicKey })
        .catch(() => {})
    }

    setStatus('success')
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Share Feedback</h2>
            <p className="text-xs text-gray-400 mt-0.5">We read every message.</p>
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
              Thank you! We'll read your message.
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
                Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us anything — suggestions, issues, compliments..."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-green"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-brand-green text-brand-gold font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
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
