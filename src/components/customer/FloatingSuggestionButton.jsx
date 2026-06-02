import { useState } from 'react'
import SuggestionModal from './SuggestionModal'

export default function FloatingSuggestionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-36 z-40 flex items-center gap-2 bg-brand-gold text-brand-green rounded-full px-4 py-2.5 shadow-lg hover:opacity-90 transition-opacity font-semibold text-sm"
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Suggest
      </button>
      {open && <SuggestionModal onClose={() => setOpen(false)} />}
    </>
  )
}
