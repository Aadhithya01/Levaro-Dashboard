import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 flex items-center gap-2 bg-brand-green text-brand-gold rounded-full px-4 py-2.5 shadow-lg hover:opacity-90 transition-opacity font-semibold text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          />
        </svg>
        Feedback
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
