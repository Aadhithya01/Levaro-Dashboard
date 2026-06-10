import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
        <span
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-brand-green text-brand-gold text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-md pointer-events-none"
          style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: '0.08em', transform: 'translateX(4px)', transitionProperty: 'opacity, transform' }}
        >
          Feedback
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-11 h-11 bg-brand-green text-brand-gold rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Give feedback"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
