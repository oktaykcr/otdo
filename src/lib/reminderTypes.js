export const REMINDER_TYPE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const REMINDER_WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

export function defaultReminderDayOfWeek() {
  return new Date().getDay()
}

export function needsReminderWeekday(type) {
  return type === 'weekly' || type === 'monthly'
}

export function needsReminderDatetime(type) {
  return type === 'once'
}

export function needsReminderTime(type) {
  return type !== 'once'
}

export function defaultOnceReminderAt() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toISOString()
}

export function reminderWeekdayLabel(dayOfWeek) {
  return REMINDER_WEEKDAY_OPTIONS.find(d => d.value === dayOfWeek)?.label
    || REMINDER_WEEKDAY_OPTIONS.find(d => d.value === defaultReminderDayOfWeek())?.label
    || 'Mon'
}

export function defaultReminderConfig(overrides = {}) {
  return {
    type: 'daily',
    time: '09:00',
    dayOfWeek: defaultReminderDayOfWeek(),
    at: null,
    ...overrides,
  }
}
