export default function CustomerFooter() {
  return (
    <footer className="bg-brand-green px-6 py-4 mt-12">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <p className="text-brand-gold/70 text-xs">© 2025 Levaro. All rights reserved.</p>
        <p className="text-brand-gold/80 text-xs">
          Support:{' '}
          <a
            href="mailto:levaro.studiossupport@gmail.com"
            className="text-brand-gold font-semibold hover:underline"
          >
            levaro.studiossupport@gmail.com
          </a>
        </p>
      </div>
    </footer>
  )
}
