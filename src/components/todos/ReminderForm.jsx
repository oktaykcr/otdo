import { Bell, Calendar, Send } from 'lucide-react'
import {
  REMINDER_TYPE_OPTIONS,
  defaultReminderDayOfWeek,
  defaultOnceReminderAt,
  needsReminderWeekday,
  needsReminderDatetime,
  needsReminderTime,
} from '../../lib/reminderTypes'
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '../../lib/todoStatus'
import ToggleSwitch from '../common/ToggleSwitch'
import ReminderWeekdayPicker from './ReminderWeekdayPicker'

export default function ReminderForm({ value, onChange, hideHeader = false, compact = false }) {
  const reminder = value || {
    enabled: false,
    type: 'daily',
    time: '09:00',
    dayOfWeek: defaultReminderDayOfWeek(),
    at: null,
    telegram: false,
  }

  const update = (patch) => onChange({ ...reminder, ...patch })

  const selectType = (type) => {
    const patch = { type }
    if (type === 'once' && !reminder.at) {
      patch.at = defaultOnceReminderAt()
    }
    update(patch)
  }

  const gridClass = compact
    ? 'grid grid-cols-2 gap-1.5 sm:grid-cols-3'
    : 'grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5'

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <span className="text-body-md text-text-muted flex items-center gap-2">
            <Bell size={16} />
            Reminders
          </span>
          <ToggleSwitch
            checked={!!reminder.enabled}
            onChange={(on) => update({ enabled: on })}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-text-muted">Enable reminder</span>
          <ToggleSwitch
            checked={!!reminder.enabled}
            onChange={(on) => update({ enabled: on })}
          />
        </div>
      )}

      {reminder.enabled && (
        <div className={`space-y-3 pl-1 animate-fade-in ${compact ? 'space-y-2' : ''}`}>
          <div>
            <label className="label">Frequency</label>
            <div className={gridClass}>
              {REMINDER_TYPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectType(t.value)}
                  className={`py-2 rounded-lg text-body-sm font-medium transition-all ${
                    reminder.type === t.value
                      ? 'bg-accent text-white'
                      : 'bg-surface2 text-text-muted hover:bg-border hover:text-text'
                  } ${compact ? 'py-1.5 text-[11px]' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {needsReminderWeekday(reminder.type) && (
            <div>
              <label className="label">Day</label>
              <ReminderWeekdayPicker
                value={reminder.dayOfWeek ?? defaultReminderDayOfWeek()}
                onChange={(dayOfWeek) => update({ dayOfWeek })}
              />
            </div>
          )}

          {needsReminderDatetime(reminder.type) && (
            <div>
              <label className="label">Date & time</label>
              <div className="relative datetime-input-wrap">
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(reminder.at)}
                  onChange={e => update({ at: fromDateTimeLocalValue(e.target.value) })}
                  className="input font-mono pr-9"
                />
                <Calendar
                  size={14}
                  strokeWidth={1.75}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden
                />
              </div>
            </div>
          )}

          {needsReminderTime(reminder.type) && (
            <div>
              <label className="label">Time</label>
              <input
                type="time"
                value={reminder.time}
                onChange={e => update({ time: e.target.value })}
                className="input font-mono"
              />
            </div>
          )}

          <div className={`flex items-center justify-between p-3 bg-surface2 rounded-lg ${compact ? 'p-2' : ''}`}>
            <div className="flex items-center gap-2 text-body-sm">
              <Send size={14} className="text-blue-400" />
              <span className="text-text-muted">Send to Telegram</span>
            </div>
            <ToggleSwitch
              checked={!!reminder.telegram}
              onChange={(on) => update({ telegram: on })}
              className={reminder.telegram ? '!bg-blue-500 !border-transparent' : ''}
            />
          </div>
        </div>
      )}
    </div>
  )
}
