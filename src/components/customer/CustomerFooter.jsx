export default function CustomerFooter() {
  return (
    <footer className="bg-brand-green mt-auto levaro-shop">
      {/* Gold rule */}
      <div className="h-px bg-brand-gold/20" />
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className="levaro-display text-brand-gold/80"
            style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '0.3em' }}
          >
            LEVARO
          </span>
          <span className="text-brand-gold/20 text-xs">·</span>
          <p className="text-brand-gold/40" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
            © 2025 All rights reserved.
          </p>
        </div>
        <p className="text-brand-gold/50" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
          Support:{' '}
          <a
            href="mailto:levaro.studiossupport@gmail.com"
            className="text-brand-gold/75 hover:text-brand-gold transition-colors"
            style={{ fontWeight: 600 }}
          >
            levaro.studiossupport@gmail.com
          </a>
        </p>
      </div>
    </footer>
  )
}
