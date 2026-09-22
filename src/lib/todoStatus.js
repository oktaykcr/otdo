export function nowISO() {
  return new Date().toISOString()
}

export function todayDateString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toDateTimeLocalValue(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export const TODO_STATUS = {
  pending: {
    label: 'Pending',
    dot: 'bg-text-faint',
    badge: 'text-text-muted bg-surface2 border border-border',
    badgeActive: 'text-text bg-surface2 border border-border font-semibold',
    title: 'text-text',
    container: 'hover:bg-surface/60',
    accent: '#64748B',
  },
  'in-progress': {
    label: 'Active',
    dot: 'bg-accent animate-pulse',
    badge: 'text-accent bg-accent/10 border border-accent/30',
    badgeActive: 'text-white bg-accent border border-accent font-semibold shadow-sm',
    title: 'text-text font-medium',
    container: 'bg-accent/[0.07] hover:bg-accent/10 ring-1 ring-inset ring-accent/25',
    accent: '#6366F1',
  },
  done: {
    label: 'Done',
    dot: 'bg-status-done',
    badge: 'text-status-done bg-status-done/10 border border-status-done/30',
    badgeActive: 'text-white bg-status-done border border-status-done font-semibold',
    title: 'line-through text-text-faint',
    container: 'opacity-70 hover:bg-surface/40',
    accent: '#10B981',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-status-cancelled',
    badge: 'text-status-cancelled bg-status-cancelled/10 border border-status-cancelled/30',
    badgeActive: 'text-white bg-status-cancelled border border-status-cancelled font-semibold',
    title: 'line-through text-text-faint/70',
    container: 'opacity-55 hover:bg-surface/30',
    accent: '#EF4444',
  },
}

export const STATUS_OPTIONS = [
  { v: 'pending',     ...TODO_STATUS.pending },
  { v: 'in-progress', ...TODO_STATUS['in-progress'] },
  { v: 'done',        ...TODO_STATUS.done },
  { v: 'cancelled',   ...TODO_STATUS.cancelled },
]

export function enrichTodoPatch(existing, patch) {
  const next = { ...patch }
  if (patch.status === 'cancelled' && !patch.cancelDate && !existing?.cancelDate) {
    next.cancelDate = nowISO()
  }
  if (patch.status === 'done' && existing?.status !== 'done' && !patch.completedAt) {
    next.completedAt = nowISO()
  }
  if (patch.status !== undefined && patch.status !== 'done' && existing?.status === 'done') {
    next.completedAt = null
  }
  return next
}

export const TODO_PRIORITY = {
  high:   { label: 'H', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { label: 'M', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  low:    { label: 'L', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
}

import { buildReminderNotificationContent } from './reminderMessages'

export function buildTodoFromSlashForm(data) {
  return {
    title: data.title,
    priority: data.priority || 'medium',
    dueDate: data.dueDate || null,
  }
}

export function buildReminderScheduleConfig(todo, settings = {}) {
  const { notificationTitle, notificationSubtitle, notificationBody, telegramText } =
    buildReminderNotificationContent(todo)
  return {
    type: todo.reminder.type,
    time: todo.reminder.time,
    dayOfWeek: todo.reminder.dayOfWeek ?? new Date().getDay(),
    at: todo.reminder.at || null,
    todoTitle: todo.title,
    todoPriority: todo.priority || 'medium',
    todoStatus: todo.status || 'pending',
    todoDueDate: todo.dueDate || null,
    notificationTitle,
    notificationSubtitle,
    notificationBody,
    telegramText,
    telegramConfig: {
      enabled: !!todo.reminder.telegram,
      botToken: settings.telegramBotToken || '',
      chatId: settings.telegramChatId || '',
    },
  }
}

export async function syncTodoReminder(todo, settings = {}) {
  if (!window.api?.reminder || !todo?.id) return
  if (todo.reminder?.enabled) {
    await window.api.reminder.schedule(todo.id, buildReminderScheduleConfig(todo, settings))
  } else {
    await window.api.reminder.cancel(todo.id)
  }
}

export function scheduleTodoReminder(todo, settings = {}) {
  if (!todo?.reminder?.enabled || !window.api?.reminder) return
  window.api.reminder.schedule(todo.id, buildReminderScheduleConfig(todo, settings))
}
