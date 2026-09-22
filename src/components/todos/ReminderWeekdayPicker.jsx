import { REMINDER_WEEKDAY_OPTIONS } from '../../lib/reminderTypes'

export default function ReminderWeekdayPicker({ value, onChange, className = '', compact = false }) {
  const selected = value ?? new Date().getDay()

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-0.5' : 'gap-1'} ${className}`}>
      {REMINDER_WEEKDAY_OPTIONS.map(({ value: day, label }) => (
        <button
          key={day}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(day)}
          className={`${compact ? 'min-w-[1.85rem] px-1 py-0.5 text-[10px] rounded-md' : 'min-w-[2.25rem] px-2 py-1.5 text-label rounded-lg'} font-medium transition-all ${
            selected === day
              ? 'bg-accent text-white'
              : 'bg-surface2 text-text-faint hover:bg-border hover:text-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
