import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Settings() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'image_enhancement_prompt')
      .single()
      .then(({ data }) => {
        if (data) setPrompt(data.value)
        setLoading(false)
      })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('app_settings')
      .upsert({ key: 'image_enhancement_prompt', value: prompt.trim(), updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-brand-green mb-6">Settings</h1>
        <div className="bg-white rounded-lg border border-brand-border p-6">
          <h2 className="font-semibold text-brand-green mb-1">Image Enhancement Prompt</h2>
          <p className="text-xs text-gray-400 mb-4">
            This prompt will be sent to AI every time you upload a product image (requires AI integration to be active).
          </p>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <form onSubmit={handleSave}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                placeholder="e.g. professional jewellery product photo, clean white background..."
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="submit"
                  disabled={saving || !prompt.trim()}
                  className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {saved && <span className="text-sm text-green-600">Saved</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
