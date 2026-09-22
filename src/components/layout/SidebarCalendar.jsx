import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import useNoteStore from '../../store/noteStore'
import { toCalendarDateKey } from '../../lib/calendarNotes'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function SidebarCalendar({ onNoteOpen }) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [expanded, setExpanded] = useState(true)
  const [busyKey, setBusyKey] = useState(null)

  const notes = useNoteStore(s => s.notes)
  const activeNoteId = useNoteStore(s => s.activeNoteId)
  const openOrCreateCalendarNote = useNoteStore(s => s.openOrCreateCalendarNote)

  const dateKeysWithNotes = useMemo(() => {
    const set = new Set()
    for (const n of notes) {
      if (!n.deletedAt && n.calendarDate) set.add(n.calendarDate)
    }
    return set
  }, [notes])

  const activeCalendarDate = useMemo(() => {
    const active = notes.find(n => n.id === activeNoteId && !n.deletedAt)
    return active?.calendarDate || null
  }, [notes, activeNoteId])

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(viewDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [viewDate])

  const handleDayClick = async (day) => {
    const key = toCalendarDateKey(day)
    if (busyKey) return
    setBusyKey(key)
    try {
      await openOrCreateCalendarNote(day)
      onNoteOpen?.()
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="flex-none border-t border-border px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg text-body-sm
                   text-text-faint hover:text-text hover:bg-surface2/60 transition-colors"
      >
        <Calendar size={14} className="flex-none" />
        <span className="flex-1 text-left font-medium">Calendar</span>
        <ChevronDown
          size={14}
          className={`flex-none transition-transform ${expanded ? '' : '-rotate-90'}`}
        />
      </button>

      {expanded && (
        <div className="mt-1 pb-1">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <button
              type="button"
              onClick={() => setViewDate(d => subMonths(d, 1))}
              className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-label font-medium text-text-muted">
              {format(viewDate, 'MMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(d => addMonths(d, 1))}
              className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface2 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] text-text-faint font-medium py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map(day => {
              const key = toCalendarDateKey(day)
              const inMonth = isSameMonth(day, viewDate)
              const today = isToday(day)
              const hasNote = dateKeysWithNotes.has(key)
              const isActive = activeCalendarDate === key
              const isBusy = busyKey === key

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!!busyKey}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-md
                    text-[11px] leading-none transition-colors
                    ${inMonth ? 'text-text-muted' : 'text-text-faint/40'}
                    ${isActive
                      ? 'bg-accent text-white font-semibold'
                      : today
                        ? 'ring-1 ring-accent/50 text-text hover:bg-surface2'
                        : 'hover:bg-surface2 hover:text-text'}
                    ${isBusy ? 'opacity-60' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {hasNote && !isActive && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
                  )}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={!!busyKey}
            onClick={() => {
              setViewDate(new Date())
              handleDayClick(new Date())
            }}
            className="w-full mt-2 py-1 rounded-lg text-label text-text-faint
                       hover:bg-surface2 hover:text-accent transition-colors"
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
