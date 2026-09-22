import { useState, useEffect, useRef } from 'react'
import { Link2, ExternalLink, Trash2, X } from 'lucide-react'
import { normalizeLinkUrl, openExternalLink } from '../../lib/openExternalLink'

export default function LinkEditPopover({ position, link, onSave, onRemove, onClose }) {
  const [label, setLabel] = useState(link?.label || '')
  const [url, setUrl] = useState(link?.href || '')
  const ref = useRef(null)

  useEffect(() => {
    setLabel(link?.label || '')
    setUrl(link?.href || '')
  }, [link])

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (!position || !link) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedLabel = label.trim()
    const href = normalizeLinkUrl(url)
    if (!trimmedLabel || !href) return
    onSave(trimmedLabel, href)
  }

  return (
    <div
      ref={ref}
      className="fixed z-[10001] w-72 rounded-xl bg-surface border border-border shadow-modal animate-scale-in"
      style={{
        top: Math.min(position.top, window.innerHeight - 280),
        left: Math.min(position.left, window.innerWidth - 300),
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-body-sm font-medium text-text">
          <Link2 size={14} className="text-accent" />
          {link?.isNew ? 'Add link' : 'Edit link'}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <div>
          <label className="text-label text-text-faint block mb-1">Text</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                       border border-border focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-label text-text-faint block mb-1">URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                       border border-border focus:outline-none focus:ring-1 focus:ring-accent font-mono"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 px-3 py-2 rounded-lg bg-accent text-white text-body-sm font-medium hover:bg-accent-hover"
          >
            {link?.isNew ? 'Add' : 'Save'}
          </button>
          {!link?.isNew && url.trim() && (
            <button
              type="button"
              title="Open link"
              onClick={() => openExternalLink(url)}
              className="p-2 rounded-lg bg-surface2 text-text-muted hover:text-text hover:bg-border"
            >
              <ExternalLink size={15} />
            </button>
          )}
          {!link?.isNew && (
            <button
              type="button"
              title="Remove link"
              onClick={onRemove}
              className="p-2 rounded-lg bg-surface2 text-text-faint hover:text-tag-important hover:bg-tag-important/10"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </form>

      <p className="px-3 pb-3 text-label text-text-faint">
        {link?.isNew ? 'Enter URL and save to create the link.' : 'Sağ tık = düzenle · Sol tık = aç'}
      </p>
    </div>
  )
}
