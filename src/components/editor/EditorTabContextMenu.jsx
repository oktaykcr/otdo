import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function EditorTabContextMenu({ position, onClose, onSplitRight, onSplitDown, onCloseTab, onCloseAll, onPin, isPinned }) {
  const ref = useRef(null)
  const openedAt = useRef(Date.now())

  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (Date.now() - openedAt.current < 80) return
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h, true)
    return () => document.removeEventListener('mousedown', h, true)
  }, [onClose])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const run = (action) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    action()
    onClose()
  }

  const item = (label, action, danger = false) => (
    <button
      type="button"
      onMouseDown={run(action)}
      className={`no-drag w-full text-left px-3 py-2 min-h-[36px] flex items-center text-body-sm transition-colors ${
        danger ? 'text-tag-important hover:bg-tag-important/10' : 'text-text-muted hover:bg-surface2 hover:text-text'
      }`}
    >
      {label}
    </button>
  )

  const top = Math.min(position.y, window.innerHeight - 220)
  const left = Math.min(position.x, window.innerWidth - 180)

  return createPortal(
    <div
      ref={ref}
      style={{ top, left, WebkitAppRegion: 'no-drag' }}
      className="no-drag fixed z-[10001] min-w-[160px] py-1 bg-surface border border-border rounded-xl shadow-modal"
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item('Split Right', onSplitRight)}
      {item('Split Down', onSplitDown)}
      <div className="my-1 border-t border-border pointer-events-none" />
      {item(isPinned ? 'Unpin' : 'Pin', onPin)}
      {item('Close', onCloseTab)}
      {item('Close All', onCloseAll, true)}
    </div>,
    document.body
  )
}
