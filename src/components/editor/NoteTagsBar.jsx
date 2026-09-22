import { useState, useRef, useEffect } from 'react'
import { Plus, X, Bell, Pin } from 'lucide-react'
import { format } from 'date-fns'
import { getTagStyle, normalizeTag } from '../../lib/noteTags'
import { needsReminderWeekday, needsReminderDatetime, reminderWeekdayLabel } from '../../lib/reminderTypes'
import NoteReminderModal from './NoteReminderModal'

function TagPill({ tag, highlighted, active, onRemove, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(tag)
  const inputRef = useRef(null)
  const style = getTagStyle(tag)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setValue(tag)
  }, [tag, editing])

  const commitEdit = () => {
    const next = normalizeTag(value)
    setEditing(false)
    if (next && next !== tag) onRename(tag, next)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setValue(tag) }
        }}
        className="h-6 px-2 rounded-full text-xs bg-surface2 border border-accent text-text outline-none min-w-[4rem] max-w-[8rem]"
      />
    )
  }

  return (
    <span
      className={`group inline-flex items-center gap-1 rounded-full font-medium px-2.5 py-0.5 text-xs transition-all ${
        active ? 'ring-2 ring-accent ring-offset-1 ring-offset-primary' : ''
      } ${highlighted ? 'brightness-125' : ''}`}
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="hover:opacity-80 transition-opacity"
        title="Rename tag"
      >
        #{tag}
      </button>
      <button
        type="button"
        onClick={() => onRemove(tag)}
        className="opacity-0 group-hover:opacity-100 hover:text-tag-important transition-all p-0.5 -mr-0.5 rounded-full"
        title="Remove tag"
      >
        <X size={11} />
      </button>
    </span>
  )
}

function ReminderButton({ reminder, onClick }) {
  const enabled = !!reminder?.enabled
  const title = enabled
    ? [
        'Reminder active',
        reminder.type,
        needsReminderDatetime(reminder.type) && reminder.at
          ? format(new Date(reminder.at), 'MMM d, HH:mm')
          : null,
        needsReminderWeekday(reminder.type) ? reminderWeekdayLabel(reminder.dayOfWeek) : null,
        reminder.type !== 'once' ? reminder.time : null,
      ].filter(Boolean).join(' · ')
    : 'Set note reminder'

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
        enabled
          ? 'text-accent bg-accent/15 hover:bg-accent/25'
          : 'text-text-faint hover:text-text hover:bg-surface2'
      }`}
    >
      <Bell size={12} strokeWidth={enabled ? 2 : 1.75} />
      {enabled && <span>Reminder</span>}
    </button>
  )
}

function PinButton({ pinned, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={pinned ? 'Unpin note' : 'Pin note'}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
        pinned
          ? 'text-accent bg-accent/15 hover:bg-accent/25'
          : 'text-text-faint hover:text-text hover:bg-surface2'
      }`}
    >
      <Pin size={12} className={pinned ? 'rotate-45' : ''} strokeWidth={pinned ? 2 : 1.75} />
      {pinned && <span>Pinned</span>}
    </button>
  )
}

export default function NoteTagsBar({
  tags = [],
  searchQuery = '',
  activeTagIdx = null,
  onAdd,
  onRemove,
  onRename,
  reminder,
  onReminderChange,
  pinned = false,
  onPinToggle,
}) {
  const [adding, setAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [reminderOpen, setReminderOpen] = useState(false)
  const addInputRef = useRef(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  const q = searchQuery.trim().toLowerCase()

  const commitAdd = () => {
    const normalized = normalizeTag(newTag)
    if (normalized) onAdd(normalized)
    setNewTag('')
    setAdding(false)
  }

  const showReminder = !!onReminderChange
  const showPin = !!onPinToggle
  const showActions = showReminder || showPin

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-1 border-b border-border/40">
        {tags.map((tag, idx) => (
          <TagPill
            key={tag}
            tag={tag}
            highlighted={q && tag.includes(q)}
            active={activeTagIdx === idx}
            onRemove={onRemove}
            onRename={onRename}
          />
        ))}

        {adding ? (
          <input
            ref={addInputRef}
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitAdd() }
              if (e.key === 'Escape') { e.preventDefault(); setAdding(false); setNewTag('') }
            }}
            placeholder="tag name"
            className="h-6 px-2 rounded-full text-xs bg-surface2 border border-border text-text
                       placeholder:text-text-faint outline-none focus:border-accent min-w-[5rem] max-w-[8rem]"
          />
        ) : tags.length > 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 p-1 rounded-full text-text-faint
                       hover:text-accent hover:bg-accent/10 transition-colors"
            title="Add tag"
          >
            <Plus size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-faint
                       hover:text-text hover:bg-surface2 transition-colors"
          >
            <Plus size={12} />
            Add tag
          </button>
        )}

        {showActions && (
          <div className="ml-auto flex items-center gap-1">
            {showPin && <PinButton pinned={pinned} onClick={onPinToggle} />}
            {showReminder && (
              <ReminderButton reminder={reminder} onClick={() => setReminderOpen(true)} />
            )}
          </div>
        )}
      </div>

      {showReminder && (
        <NoteReminderModal
          open={reminderOpen}
          onClose={() => setReminderOpen(false)}
          reminder={reminder}
          onChange={onReminderChange}
        />
      )}
    </>
  )
}
