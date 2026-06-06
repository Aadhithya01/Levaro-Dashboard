import { useRef } from 'react'

export default function MediaUploadSection({ items, onChange, maxItems = 10 }) {
  const fileInputRef = useRef(null)

  function handleFiles(e) {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length) return
    const remaining = maxItems - items.length
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      isExisting: false,
      removable: true,
    }))
    onChange([...items, ...toAdd])
  }

  function removeItem(idx) {
    const item = items[idx]
    if (!item.isExisting && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Photos / Videos{' '}
        <span className="text-gray-400 font-normal">(optional, max {maxItems})</span>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-border"
            >
              {item.type === 'video' ? (
                <video
                  src={item.previewUrl ?? item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={item.previewUrl ?? item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {item.removable && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-500 leading-none"
                >
                  ✕
                </button>
              )}
              {item.type === 'video' && (
                <div className="absolute bottom-0.5 left-0.5 bg-black/60 rounded px-1 text-white text-[9px]">
                  ▶
                </div>
              )}
              {!item.removable && (
                <div className="absolute bottom-0.5 left-0.5 bg-black/40 rounded px-1 text-white text-[9px]">
                  main
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {items.length < maxItems && (
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="w-full border-2 border-dashed border-brand-border rounded-lg py-3 text-sm text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
        >
          📷 Add photo / video{items.length > 0 ? ` (${items.length}/${maxItems})` : ''}
        </button>
      )}
    </div>
  )
}
