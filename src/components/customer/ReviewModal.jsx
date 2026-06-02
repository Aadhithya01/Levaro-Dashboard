import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none focus:outline-none transition-colors"
          style={{ color: star <= (hovered || value) ? '#e8c96a' : '#d1d5db' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewModal({ productId, productName, onClose }) {
  const [reviewerName, setReviewerName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [ratingError, setRatingError] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setRatingError(true); return }
    setRatingError(false)
    setStatus('submitting')

    const { error } = await supabase.from('product_reviews').insert({
      product_id:    productId,
      reviewer_name: reviewerName.trim(),
      rating,
      comment:       comment.trim(),
    })

    if (error) { setStatus('error'); return }

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_REVIEW_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (serviceId && templateId && publicKey) {
      await emailjs
        .send(serviceId, templateId, {
          product_name:  productName,
          reviewer_name: reviewerName.trim(),
          rating:        `${rating}/5`,
          comment:       comment.trim(),
        }, { publicKey })
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
            <p className="text-xs font-semibold text-brand-green uppercase tracking-widest">
              {productName}
            </p>
            <h2 className="text-lg font-bold text-gray-800 mt-0.5">Write a Review</h2>
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
              Thank you for your review!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                placeholder="e.g. Priya S."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                Rating
              </label>
              <StarRating value={rating} onChange={r => { setRating(r); setRatingError(false) }} />
              {ratingError && (
                <p className="text-red-500 text-xs mt-1">Please select a star rating.</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Comment
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
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
              {status === 'submitting' ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
