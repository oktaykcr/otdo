import { useState, useRef, useEffect, useCallback } from 'react'
import { format, isPast, isToday } from 'date-fns'
import { ChevronDown, ChevronUp, Trash2, Calendar, X, Flag, CalendarDays, Bell } from 'lucide-react'
import useTodoStore from '../../../store/todoStore'
import { TODO_STATUS, STATUS_OPTIONS, TODO_PRIORITY, toDateTimeLocalValue, fromDateTimeLocalValue } from '../../../lib/todoStatus'
import { isLongTodoTitle } from '../../../lib/todoTitle'
import ReminderForm from '../../todos/ReminderForm'

const PRIORITY = TODO_PRIORITY

const NOTES_COLLAPSED_HEIGHT = 32
const NOTES_EXPANDED_DEFAULT = 96
const NOTES_EXPANDED_MIN = 48
const NOTES_EXPANDED_MAX = 280

function clampNotesHeight(value) {
  return Math.min(NOTES_EXPANDED_MAX, Math.max(NOTES_EXPANDED_MIN, value))
}

function DetailGroup({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-md bg-surface2/30 border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-border/30 bg-surface/20">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon size={11} className="text-text-muted flex-none" strokeWidth={1.75} />}
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-2 space-y-1.5">{children}</div>
    </section>
  )
}

function DateTimeField({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-faint w-10 shrink-0">{label}</span>
      <div className="relative datetime-input-wrap flex-1 min-w-0">
        <input
          type="datetime-local"
          value={value}
          onChange={onChange}
          className="w-full bg-surface2 text-[11px] text-text rounded-md pl-2 pr-7 py-1 border border-border
                     focus:outline-none focus:ring-1 focus:ring-accent font-mono"
        />
        <Calendar
          size={11}
          strokeWidth={1.75}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          aria-hidden
        />
      </div>
    </div>
  )
}

export default function TodoBlock({ block, onChange, onDelete, focused, onFocus, onEnter, searchSelectRange }) {
  const todos      = useTodoStore(s => s.todos)
  const addTodo    = useTodoStore(s => s.addTodo)
  const updateTodo = useTodoStore(s => s.updateTodo)
  const deleteTodo = useTodoStore(s => s.deleteTodo)

  const [expanded, setExpanded] = useState(false)
  const [titleFocused, setTitleFocused] = useState(false)
  const [notesHeight, setNotesHeight] = useState(NOTES_COLLAPSED_HEIGHT)
  const inputRef = useRef(null)
  const notesRef = useRef(null)
  const rootRef = useRef(null)
  const notesDragging = useRef(false)

  useEffect(() => {
    if (expanded) {
      setNotesHeight(h => Math.max(h, NOTES_EXPANDED_DEFAULT))
    }
  }, [expanded])

  const startNotesResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    notesDragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!notesDragging.current || !notesRef.current) return
      const rect = notesRef.current.getBoundingClientRect()
      setNotesHeight(clampNotesHeight(e.clientY - rect.top))
    }

    const onUp = () => {
      if (!notesDragging.current) return
      notesDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    if (!expanded || !rootRef.current) return
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [expanded])

  // Get or lazily create the todo entry
  const todo = block.todoId ? todos.find(t => t.id === block.todoId) : null

  // If block has a todoId but todo was deleted, show empty state
  const isDone      = todo?.status === 'done'
  const isCancelled = todo?.status === 'cancelled'
  const status      = todo?.status || 'pending'
  const statusCfg   = TODO_STATUS[status] || TODO_STATUS.pending
  const priority    = todo?.priority || 'medium'
  const cfg         = PRIORITY[priority]
  const dueDate     = todo?.dueDate

  const dueOverdue  = dueDate && isPast(new Date(dueDate)) && !isDone && !isCancelled
  const dueToday    = dueDate && isToday(new Date(dueDate)) && !isDone

  // Focus input when block is focused
  useEffect(() => {
    if (focused) inputRef.current?.focus()
  }, [focused])

  useEffect(() => {
    if (!searchSelectRange) return
    const el = searchSelectRange.field === 'description' ? notesRef.current : inputRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(searchSelectRange.start, searchSelectRange.end)
  }, [searchSelectRange])

  const ensureTodo = async (title) => {
    if (block.todoId) return block.todoId
    const t = await addTodo({ title, priority: 'medium' })
    onChange({ ...block, todoId: t.id, content: title })
    return t.id
  }

  const handleTitleChange = async (e) => {
    const title = e.target.value
    onChange({ ...block, content: title })
    if (block.todoId) {
      await updateTodo(block.todoId, { title })
    }
  }

  const handleTitleBlur = async () => {
    if (!block.content.trim()) return
    if (!block.todoId) {
      await ensureTodo(block.content)
    }
  }

  const handleTitleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (block.content.trim() && !block.todoId) {
        await ensureTodo(block.content.trim())
      }
      onEnter?.()
      return
    }
    if (e.key === 'Backspace' && !block.content) {
      e.preventDefault()
      onDelete?.()
    }
  }

  const toggleDone = async () => {
    const id = block.todoId || await ensureTodo(block.content)
    const next = isDone ? 'pending' : 'done'
    await updateTodo(id, { status: next })
  }

  const setPriority = async (p) => {
    const id = block.todoId || await ensureTodo(block.content)
    await updateTodo(id, { priority: p })
  }

  const setDateTime = async (field, localValue) => {
    const id = block.todoId || await ensureTodo(block.content)
    await updateTodo(id, { [field]: fromDateTimeLocalValue(localValue) })
  }

  const handleNotesChange = async (e) => {
    const val = e.target.value
    if (!block.todoId && !block.content.trim()) return
    const id = block.todoId || await ensureTodo(block.content.trim())
    await updateTodo(id, { description: val })
  }

  const setStatus = async (nextStatus) => {
    const id = block.todoId || await ensureTodo(block.content)
    await updateTodo(id, { status: nextStatus })
  }

  const handleDelete = async () => {
    if (block.todoId) await deleteTodo(block.todoId)
    onDelete()
  }

  const updateReminder = async (reminder) => {
    const id = block.todoId || await ensureTodo(block.content)
    await updateTodo(id, { reminder })
  }

  return (
    <div
      ref={rootRef}
      data-todo-id={block.todoId || undefined}
      className={`group relative rounded-xl transition-all duration-200 ${
        expanded ? 'bg-surface shadow-card' : statusCfg.container
      }`}
      onClick={onFocus}
    >
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-200"
        style={{
          backgroundColor: status === 'pending' ? cfg.color : statusCfg.accent,
          opacity: isDone || isCancelled ? 0.35 : 1,
        }}
      />

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5 pl-3">

        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); isCancelled ? setStatus('pending') : toggleDone() }}
          className={`
            flex-none w-5 h-5 rounded-md border-2 transition-all duration-150
            flex items-center justify-center
            ${isDone ? 'border-transparent' : ''}
            ${status === 'in-progress' ? 'border-accent' : ''}
            ${status === 'cancelled' ? 'border-status-cancelled/60 bg-status-cancelled/10' : ''}
            ${status === 'pending' ? 'border-border hover:border-current' : ''}
          `}
          style={
            isDone
              ? { backgroundColor: statusCfg.accent }
              : status === 'pending'
                ? { borderColor: cfg.color }
                : undefined
          }
        >
          {isDone && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {status === 'in-progress' && !isDone && (
            <span className="w-2 h-2 rounded-sm bg-accent" />
          )}
          {isCancelled && (
            <X size={11} className="text-status-cancelled" strokeWidth={2.5} />
          )}
        </button>

        {/* Title input */}
        <input
          ref={inputRef}
          value={block.content}
          onChange={handleTitleChange}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => {
            setTitleFocused(false)
            handleTitleBlur()
          }}
          onKeyDown={handleTitleKeyDown}
          placeholder="Task title..."
          title={block.content}
          className={`
            flex-1 min-w-0 bg-transparent text-body-md leading-snug
            focus:outline-none placeholder:text-text-faint
            transition-all duration-150
            ${!titleFocused && isLongTodoTitle(block.content) ? 'truncate' : ''}
            ${statusCfg.title}
          `}
        />

        <div className="flex items-center gap-2 flex-none">
          <span
            className="text-label px-1.5 py-0.5 rounded-md font-medium capitalize"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {priority}
          </span>
          <span className={`text-label px-1.5 py-0.5 rounded-md border ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-label px-1.5 py-0.5 rounded-md font-mono ${
                dueOverdue ? 'text-tag-important bg-tag-important/10' :
                dueToday   ? 'text-tag-warning bg-tag-warning/10' :
                             'text-text-faint bg-surface2'
              }`}
            >
              <Calendar size={10} className="text-text-muted" strokeWidth={1.75} />
              {format(new Date(dueDate), 'MMM d, HH:mm')}
            </span>
          )}
          {todo?.reminder?.enabled && (
            <span className="flex items-center gap-0.5 text-label px-1.5 py-0.5 rounded-md text-accent bg-accent/10">
              <Bell size={10} strokeWidth={2} />
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(x => !x) }}
          className={`flex-none p-1 rounded-lg transition-all ${
            expanded ? 'text-accent bg-accent/10' : 'text-text-faint hover:text-text hover:bg-surface2'
          }`}
          title="Todo options"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="px-3 pb-2 pl-7" onClick={e => e.stopPropagation()}>
        <textarea
          ref={notesRef}
          value={todo?.description || ''}
          onChange={handleNotesChange}
          placeholder="Notes..."
          style={{ height: notesHeight }}
          className="w-full bg-surface2/60 border border-border/60 rounded-md px-2.5 py-1.5
                     text-body-sm text-text placeholder:text-text-faint
                     focus:outline-none focus:ring-1 focus:ring-accent resize-none overflow-y-auto"
        />
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize notes"
          onMouseDown={startNotesResize}
          className="mt-1 h-1 rounded-full cursor-row-resize bg-border/40 hover:bg-accent/50 active:bg-accent transition-colors"
        />
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 pt-2 space-y-2 animate-fade-in border-t border-border/40 ml-2.5" onClick={e => e.stopPropagation()}>
          {isLongTodoTitle(block.content) && (
            <div className="px-1 pb-1">
              <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Title</div>
              <p className={`text-body-md break-words leading-relaxed ${statusCfg.title}`}>
                {block.content}
              </p>
            </div>
          )}
          <DetailGroup title="Task" icon={Flag}>
            <div className="flex gap-0.5 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setStatus(s.v)}
                  className={`px-2 py-0.5 rounded-md text-[11px] border transition-all ${
                    status === s.v ? s.badgeActive : `${s.badge} hover:opacity-90`
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5">
              {Object.entries(PRIORITY).map(([p, pcfg]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-all border ${
                    priority === p ? 'text-white border-transparent' : 'text-text-faint border-border hover:bg-surface2'
                  }`}
                  style={priority === p ? { backgroundColor: pcfg.color } : undefined}
                >
                  {p}
                </button>
              ))}
            </div>
          </DetailGroup>

          <DetailGroup title="Schedule" icon={CalendarDays}>
            <div className="space-y-1">
              {[
                { field: 'startDate', label: 'Start' },
                { field: 'dueDate', label: 'Due' },
                { field: 'cancelDate', label: 'Cancel' },
              ].map(({ field, label }) => (
                <DateTimeField
                  key={field}
                  label={label}
                  value={toDateTimeLocalValue(todo?.[field])}
                  onChange={e => setDateTime(field, e.target.value)}
                />
              ))}
            </div>
          </DetailGroup>

          <DetailGroup title="Reminder" icon={Bell}>
            <ReminderForm
              value={todo?.reminder}
              onChange={updateReminder}
              hideHeader
              compact
            />
          </DetailGroup>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]
                         text-text-muted hover:text-tag-important hover:bg-tag-important/10 transition-colors"
            >
              <Trash2 size={11} className="text-text-muted" strokeWidth={1.75} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
