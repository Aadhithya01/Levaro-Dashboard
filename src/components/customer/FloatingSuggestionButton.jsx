import { useState } from 'react'
import SuggestionModal from './SuggestionModal'

export default function FloatingSuggestionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-20 z-40 flex items-center gap-2 group">
        <span
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-brand-gold text-brand-green text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-md pointer-events-none"
          style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: '0.08em' }}
        >
          Suggest
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-11 h-11 bg-brand-gold text-brand-green rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Make a suggestion"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      </div>
      {open && <SuggestionModal onClose={() => setOpen(false)} />}
    </>
  )
}
