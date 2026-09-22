import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import useNoteStore from '../../store/noteStore'
import { filterNotesForMention } from '../../lib/noteMentions'
import { getNoteIcon } from '../../lib/noteIcons'

const MENU_WIDTH = 280
const VIEWPORT_PADDING = 12

export default function NoteMentionMenu({
  position,
  query,
  excludeNoteId,
  onSelect,
  onClose,
}) {
  const notes = useNoteStore(s => s.notes)
  const [activeIdx, setActiveIdx] = useState(0)
  const [coords, setCoords] = useState({ top: position.top, left: position.left })
  const menuRef = useRef(null)
  const listRef = useRef(null)

  const filtered = useMemo(
    () => filterNotesForMention(notes, query, excludeNoteId),
    [notes, query, excludeNoteId],
  )

  const updatePosition = useCallback(() => {
    const el = menuRef.current
    if (!el) return

    const height = el.offsetHeight
    let top = position.top
    let left = Math.min(position.left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)

    const maxTop = window.innerHeight - height - VIEWPORT_PADDING
    if (top > maxTop) top = Math.max(VIEWPORT_PADDING, maxTop)

    setCoords({ top, left })
  }, [position.top, position.left])

  useEffect(() => {
    updatePosition()
    const el = menuRef.current
    if (!el) return

    const ro = new ResizeObserver(updatePosition)
    ro.observe(el)
    window.addEventListener('resize', updatePosition)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePosition)
    }
  }, [updatePosition, filtered.length, query])

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-mention-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, filtered.length])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const note = filtered[activeIdx]
        if (note) onSelect(note)
      }
    }
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [filtered, activeIdx, onSelect, onClose])

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const menuStyle = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    zIndex: 9999,
    width: MENU_WIDTH,
    maxHeight: `calc(100vh - ${VIEWPORT_PADDING * 2}px)`,
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-surface border border-border rounded-2xl shadow-modal overflow-hidden animate-scale-in flex flex-col"
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <p className="text-label text-text-faint uppercase tracking-wider">Link note</p>
        {query && (
          <p className="text-body-sm text-text-muted mt-1 truncate">@{query}</p>
        )}
      </div>

      <div ref={listRef} className="overflow-y-auto max-h-60 py-1">
        {filtered.length === 0 ? (
          <p className="text-body-sm text-text-faint text-center py-6 px-3">No notes found</p>
        ) : (
          filtered.map((note, idx) => {
            const Icon = getNoteIcon(note.icon)
            const isActive = idx === activeIdx
            return (
              <button
                key={note.id}
                type="button"
                data-mention-idx={idx}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => { e.preventDefault(); onSelect(note) }}
                className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                  isActive ? 'bg-accent/15' : 'hover:bg-surface2'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                  isActive ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
                }`}>
                  <Icon size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-body-sm text-text leading-tight truncate">{note.name}</div>
                  <div className="text-label text-text-faint font-mono truncate">
                    {note.cloudSync ? 'Drive' : 'Local'}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-border flex items-center gap-3 text-label text-text-faint">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>Esc close</span>
      </div>
    </div>
  )
}
