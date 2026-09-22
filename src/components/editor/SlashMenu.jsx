import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2,
  Minus, CheckSquare, Table, Link2,
  ChevronLeft, Plus, Calendar, CalendarDays, Clock,
} from 'lucide-react'
import { TODO_PRIORITY, fromDateTimeLocalValue } from '../../lib/todoStatus'
import { getSlashDateTimeInsert } from '../../lib/slashDateTime'
import { normalizeLinkUrl } from '../../lib/openExternalLink'

// ─── Command definitions ────────────────────────────────────────────────────
const COMMANDS = [
  // Text
  { id: 'h1',        label: 'Heading 1',     desc: 'Large title',            icon: Heading1,    cat: 'Text',      type: 'h1' },
  { id: 'h2',        label: 'Heading 2',     desc: 'Section title',          icon: Heading2,    cat: 'Text',      type: 'h2' },
  { id: 'h3',        label: 'Heading 3',     desc: 'Subsection',             icon: Heading3,    cat: 'Text',      type: 'h3' },
  { id: 'quote',     label: 'Blockquote',    desc: 'Quoted text',            icon: Quote,       cat: 'Text',      type: 'quote' },
  { id: 'link',      label: 'Link',          desc: 'Hyperlink',              icon: Link2,       cat: 'Text',      type: 'link' },
  { id: 'codeblock', label: 'Code Block',    desc: 'Multi-line code',        icon: Code2,       cat: 'Text',      type: 'block' },
  // Lists
  { id: 'bullet',    label: 'Bullet List',   desc: 'Unordered list item',    icon: List,        cat: 'Lists',     type: 'bullet' },
  { id: 'numbered',  label: 'Numbered List', desc: 'Ordered list item',      icon: ListOrdered, cat: 'Lists',     type: 'numbered' },
  // Structure
  { id: 'divider',   label: 'Divider',       desc: 'Horizontal separator',   icon: Minus,       cat: 'Structure', type: 'divider' },
  { id: 'table',     label: 'Table',         desc: 'Rows and columns',       icon: Table,       cat: 'Structure', type: 'table' },
  // Todo
  { id: 'todo', label: 'Todo', desc: 'Create a task', icon: CheckSquare, cat: 'Todo', type: 'todo' },
  // Insert
  {
    id: 'today',
    label: 'Today',
    desc: 'Full date for today',
    icon: CalendarDays,
    cat: 'Insert',
    type: 'insert-today',
    searchTerms: ['today', 'bugün'],
  },
  {
    id: 'date',
    label: 'Date',
    desc: 'ISO date (yyyy-MM-dd)',
    icon: Calendar,
    cat: 'Insert',
    type: 'insert-date',
    searchTerms: ['date', 'tarih'],
  },
  {
    id: 'time',
    label: 'Time',
    desc: 'Current hour (HH:mm)',
    icon: Clock,
    cat: 'Insert',
    type: 'insert-time',
    searchTerms: ['time', 'hour', 'saat'],
  },
]

const CATEGORIES = ['Text', 'Lists', 'Structure', 'Todo', 'Insert']

// ─── Todo sub-form ──────────────────────────────────────────────────────────
function TodoForm({ onSubmit, onBack }) {
  const [title,    setTitle]    = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate,  setDueDate]  = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit(title.trim(), {
      title: title.trim(),
      priority,
      dueDate: fromDateTimeLocalValue(dueDate),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3">
      {/* Back */}
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-label text-text-faint hover:text-text transition-colors">
        <ChevronLeft size={12} /> Back
      </button>

      {/* Title */}
      <div>
        <label className="text-label text-text-faint block mb-1">Title</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                     border border-border focus:outline-none focus:ring-1 focus:ring-accent
                     placeholder:text-text-faint"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="text-label text-text-faint block mb-1.5">Priority</label>
        <div className="flex gap-1">
          {Object.entries(TODO_PRIORITY).map(([v, pcfg]) => (
            <button
              key={v}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPriority(v)}
              className={`flex-1 py-1.5 rounded-lg text-label font-medium capitalize transition-all border ${
                priority === v
                  ? 'text-white border-transparent'
                  : 'bg-surface2 text-text-faint border-border hover:bg-border'
              }`}
              style={priority === v ? { backgroundColor: pcfg.color } : undefined}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Due date */}
      <div>
        <label className="text-label text-text-faint block mb-1">Due Date</label>
        <div className="relative datetime-input-wrap">
          <input
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full bg-surface2 text-body-sm text-text rounded-lg pl-3 pr-9 py-2
                       border border-border focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Calendar
            size={15}
            strokeWidth={1.75}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
        </div>
      </div>

      <button type="submit"
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                   bg-accent text-white text-body-sm font-medium hover:bg-accent-hover transition-colors">
        <Plus size={13} /> Create Task
      </button>
    </form>
  )
}

// ─── Link sub-form ──────────────────────────────────────────────────────────
function LinkForm({ onSubmit, onBack }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedLabel = label.trim()
    const href = normalizeLinkUrl(url)
    if (!trimmedLabel || !href) return
    onSubmit(trimmedLabel, href)
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-label text-text-faint hover:text-text transition-colors">
        <ChevronLeft size={12} /> Back
      </button>

      <div>
        <label className="text-label text-text-faint block mb-1">Text</label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Link label..."
          className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                     border border-border focus:outline-none focus:ring-1 focus:ring-accent
                     placeholder:text-text-faint"
        />
      </div>

      <div>
        <label className="text-label text-text-faint block mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                     border border-border focus:outline-none focus:ring-1 focus:ring-accent
                     placeholder:text-text-faint font-mono"
        />
      </div>

      <button type="submit"
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                   bg-accent text-white text-body-sm font-medium hover:bg-accent-hover transition-colors">
        <Link2 size={13} /> Insert Link
      </button>
    </form>
  )
}

const MENU_WIDTH = 272
const VIEWPORT_PADDING = 12

// ─── Main SlashMenu ─────────────────────────────────────────────────────────
export default function SlashMenu({ position, query, onSelect, onClose }) {
  const [search,    setSearch]    = useState(query || '')
  const [activeIdx, setActiveIdx] = useState(0)
  const [todoCmd,   setTodoCmd]   = useState(null)
  const [linkCmd,   setLinkCmd]   = useState(null)
  const [coords,    setCoords]    = useState({ top: position.top, left: position.left })
  const menuRef   = useRef(null)
  const listRef   = useRef(null)
  const searchRef = useRef(null)

  const updatePosition = useCallback(() => {
    const el = menuRef.current
    if (!el) return

    const height = el.offsetHeight
    let top = position.top
    let left = Math.min(position.left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)

    const maxTop = window.innerHeight - height - VIEWPORT_PADDING
    if (top > maxTop) {
      top = Math.max(VIEWPORT_PADDING, maxTop)
    }

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
  }, [updatePosition, todoCmd, linkCmd, search])

  useEffect(() => { setSearch(query || '') }, [query])

  useEffect(() => {
    if (!todoCmd && !linkCmd) searchRef.current?.focus()
  }, [todoCmd, linkCmd])

  const filtered = COMMANDS.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.label.toLowerCase().includes(q) ||
      c.cat.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.searchTerms || []).some(t => t.toLowerCase().includes(q))
    )
  })

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(c => c.cat === cat)
    if (items.length) acc.push({ cat, items })
    return acc
  }, [])

  const flat = filtered

  const handleSelect = useCallback((cmd) => {
    if (cmd.type === 'todo') {
      setTodoCmd(cmd)
      return
    }
    if (cmd.type === 'link') {
      setLinkCmd(cmd)
      return
    }
    onSelect({ type: cmd.type })
  }, [onSelect])

  const handleTodoSubmit = useCallback((title, data) => {
    onSelect({ type: 'todo-create', data })
  }, [onSelect])

  const handleLinkSubmit = useCallback((label, href) => {
    onSelect({ type: 'link-create', data: { label, href } })
  }, [onSelect])

  useEffect(() => { setActiveIdx(0) }, [search])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-slash-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, flat.length])

  useEffect(() => {
    const h = (e) => {
      if (todoCmd || linkCmd) return
      if (e.key === 'Escape')    { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = flat[activeIdx]
        if (cmd) handleSelect(cmd)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [flat, activeIdx, todoCmd, linkCmd, handleSelect, onClose])

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
      className="bg-surface border border-border rounded-2xl shadow-modal overflow-y-auto animate-scale-in"
    >
      {todoCmd ? (
        <TodoForm
          onSubmit={handleTodoSubmit}
          onBack={() => setTodoCmd(null)}
        />
      ) : linkCmd ? (
        <LinkForm
          onSubmit={handleLinkSubmit}
          onBack={() => setLinkCmd(null)}
        />
      ) : (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands..."
              className="w-full bg-surface2 text-body-sm text-text rounded-lg px-3 py-2
                         border border-border focus:outline-none focus:ring-1 focus:ring-accent
                         placeholder:text-text-faint"
            />
          </div>

          {/* Commands */}
          <div ref={listRef} className="overflow-y-auto max-h-72 py-1">
            {grouped.length === 0 && (
              <p className="text-body-sm text-text-faint text-center py-6">No commands found</p>
            )}
            {grouped.map(({ cat, items }) => (
              <div key={cat}>
                <div className="px-3 pt-2.5 pb-1">
                  <span className="text-label text-text-faint uppercase tracking-wider">{cat}</span>
                </div>
                {items.map(cmd => {
                  const globalIdx = flat.indexOf(cmd)
                  const isActive  = globalIdx === activeIdx
                  return (
                    <button
                      key={cmd.id}
                      data-slash-idx={globalIdx}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(cmd) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                        isActive ? 'bg-accent/15' : 'hover:bg-surface2'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                        isActive ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
                      }`}>
                        <cmd.icon size={15} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-body-sm text-text leading-tight">{cmd.label}</div>
                        <div className="text-label text-text-faint font-mono truncate">
                          {cmd.type?.startsWith('insert-')
                            ? getSlashDateTimeInsert(cmd.type.replace('insert-', ''))
                            : cmd.desc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-3 text-label text-text-faint">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>Esc close</span>
          </div>
        </>
      )}
    </div>
  )
}
