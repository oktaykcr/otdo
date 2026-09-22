import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Cloud, HardDrive, Plus, Pin, Bell, AlertCircle } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import useQuickReminderStore from '../../store/quickReminderStore'
import { getNoteIcon } from '../../lib/noteIcons'
import { noteMatchesSearchQuery } from '../../lib/noteTags'
import { isMac } from '../../lib/platform'
import { isRemindQuery, parseRemindCommand } from '../../lib/remindCommandParser'
import NewNoteModal from '../notes/NewNoteModal'

const NEW_NOTE_ACTIONS = [
  {
    id: 'new-local',
    label: 'New Local Note',
    desc: 'Create a note on this device',
    icon: HardDrive,
    cloudSync: false,
    searchTerms: ['new', 'note', 'local', 'create', 'yeni', 'not'],
  },
  {
    id: 'new-drive',
    label: 'New Drive Note',
    desc: 'Create and sync to Google Drive',
    icon: Cloud,
    cloudSync: true,
    searchTerms: ['new', 'note', 'drive', 'google', 'cloud', 'create', 'yeni', 'not'],
  },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [newNoteOpen, setNewNoteOpen] = useState(false)
  const [newNoteCloudSync, setNewNoteCloudSync] = useState(false)

  const inputRef = useRef(null)
  const listRef = useRef(null)

  const navigate = useNavigate()
  const location = useLocation()
  const notes = useNoteStore(s => s.notes)
  const openNote = useNoteStore(s => s.openNote)
  const addQuickReminder = useQuickReminderStore(s => s.addQuickReminder)

  const remindParsed = useMemo(() => {
    if (!isRemindQuery(query)) return null
    return parseRemindCommand(query)
  }, [query])

  const items = useMemo(() => {
    if (remindParsed) {
      return [{ kind: 'remind', parsed: remindParsed }]
    }

    const q = query.trim().toLowerCase()

    const actions = NEW_NOTE_ACTIONS.filter(action => {
      if (!q) return true
      return (
        action.label.toLowerCase().includes(q) ||
        action.desc.toLowerCase().includes(q) ||
        action.searchTerms.some(term => term.includes(q) || q.includes(term))
      )
    }).map(action => ({ kind: 'action', action }))

    const noteItems = notes
      .filter(n => !n.deletedAt && noteMatchesSearchQuery(n, q))
      .sort((a, b) => {
        const aPin = a.pinned ? 1 : 0
        const bPin = b.pinned ? 1 : 0
        if (bPin !== aPin) return bPin - aPin
        return a.name.localeCompare(b.name)
      })
      .map(note => ({ kind: 'note', note }))

    return [...actions, ...noteItems]
  }, [notes, query, remindParsed])

  const close = useCallback(() => setOpen(false), [])

  const openCreatedNote = useCallback(async (note) => {
    if (!note) return
    await openNote(note.id)
    if (location.pathname !== '/') navigate('/')
  }, [openNote, location.pathname, navigate])

  const selectItem = useCallback(async (item) => {
    if (!item) return
    if (item.kind === 'remind') {
      const { parsed } = item
      if (!parsed || parsed.incomplete || parsed.error || !parsed.title) return
      await addQuickReminder({ title: parsed.title, reminder: parsed.reminder })
      close()
      if (location.pathname !== '/notifications') navigate('/notifications')
      return
    }
    if (item.kind === 'action') {
      close()
      setNewNoteCloudSync(item.action.cloudSync)
      setNewNoteOpen(true)
      return
    }
    close()
    await openCreatedNote(item.note)
  }, [close, openCreatedNote, addQuickReminder, location.pathname, navigate])

  useEffect(() => {
    const onGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setOpen(v => !v)
        return
      }
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectItem(items[activeIdx])
      }
    }
    document.addEventListener('keydown', onGlobalKey)
    return () => document.removeEventListener('keydown', onGlobalKey)
  }, [open, items, activeIdx, close, selectItem])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIdx(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, items.length])

  const shortcutLabel = isMac ? '⌘⇧P' : 'Ctrl+Shift+P'
  const placeholder = remindParsed
    ? 'remind 15:00 … · remind next monday …'
    : 'Search notes, create, or remind…'

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in" />

          <div
            className="relative w-full max-w-lg bg-surface border border-border rounded-2xl
                       shadow-modal overflow-hidden animate-scale-in"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search size={16} className="text-text-faint flex-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-body-sm text-text outline-none
                           placeholder:text-text-faint"
              />
              <kbd className="text-[10px] text-text-faint bg-surface2 px-1.5 py-0.5 rounded border border-border">
                {shortcutLabel}
              </kbd>
            </div>

            <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
              {items.length === 0 ? (
                <p className="text-body-sm text-text-faint text-center py-8">No results found</p>
              ) : (
                items.map((item, idx) => {
                  const isActive = idx === activeIdx

                  if (item.kind === 'remind') {
                    const { parsed } = item
                    const canCreate = !parsed.incomplete && !parsed.error && !!parsed.title
                    return (
                      <button
                        key="remind-action"
                        type="button"
                        data-cmd-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectItem(item)}
                        disabled={!canCreate}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${
                          isActive && canCreate ? 'bg-accent/15' : canCreate ? 'hover:bg-surface2' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                          parsed.error
                            ? 'bg-tag-important/15 text-tag-important'
                            : isActive && canCreate
                              ? 'bg-accent text-white'
                              : 'bg-surface2 text-tag-warning'
                        }`}>
                          {parsed.error ? <AlertCircle size={15} strokeWidth={1.75} /> : <Bell size={15} strokeWidth={1.75} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-body-sm text-text leading-tight truncate">
                            {canCreate
                              ? `Remind: ${parsed.title}`
                              : parsed.error
                                ? 'Could not parse reminder'
                                : 'Set a quick reminder'}
                          </div>
                          <div className="text-label text-text-faint truncate">
                            {canCreate
                              ? parsed.preview
                              : parsed.hint || parsed.preview}
                          </div>
                        </div>
                        {canCreate && <Bell size={14} className="text-text-faint flex-none" />}
                      </button>
                    )
                  }

                  if (item.kind === 'action') {
                    const { action } = item
                    const ActionIcon = action.icon
                    return (
                      <button
                        key={action.id}
                        type="button"
                        data-cmd-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectItem(item)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-accent/15' : 'hover:bg-surface2'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                          isActive ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
                        }`}>
                          <ActionIcon size={15} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-body-sm text-text leading-tight">{action.label}</div>
                          <div className="text-label text-text-faint truncate">{action.desc}</div>
                        </div>
                        <Plus size={14} className="text-text-faint flex-none" />
                      </button>
                    )
                  }

                  const { note } = item
                  const Icon = getNoteIcon(note.icon)
                  return (
                    <button
                      key={note.id}
                      type="button"
                      data-cmd-idx={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectItem(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-accent/15' : 'hover:bg-surface2'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                        isActive ? 'bg-accent text-white' : 'bg-surface2 text-text-muted'
                      }`}>
                        <Icon size={15} strokeWidth={1.75} />
                      </div>
                      <span className="flex-1 text-body-sm text-text truncate">{note.name}</span>
                      {note.pinned && (
                        <Pin size={12} className="flex-none text-accent rotate-45" />
                      )}
                      {note.tags?.length > 0 && (
                        <span className="text-label text-text-faint truncate max-w-[6rem]">
                          {note.tags.map(t => `#${t}`).join(' ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-label text-text-faint flex-none">
                        {note.cloudSync ? <Cloud size={12} /> : <HardDrive size={12} />}
                        {note.cloudSync ? 'Drive' : 'Local'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-label text-text-faint">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>Esc close</span>
            </div>
          </div>
        </div>
      )}

      <NewNoteModal
        open={newNoteOpen}
        onClose={() => setNewNoteOpen(false)}
        folderId={null}
        cloudSync={newNoteCloudSync}
        onCreated={openCreatedNote}
      />
    </>
  )
}
