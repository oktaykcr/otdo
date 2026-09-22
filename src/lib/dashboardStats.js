import { isToday } from 'date-fns'
import { todayDateString } from './todoStatus'
import { getTodoCompletedAt } from './todoActivityReport'
import { isCanvasNote } from './noteCanvas'
import { activeNotes } from './noteTrash'

export function isTodoOverdue(todo) {
  if (!todo.dueDate) return false
  if (todo.status === 'done' || todo.status === 'cancelled') return false
  return new Date(todo.dueDate) < new Date()
}

export function computeDashboardStats({ todos = [], notes = [], folders = [], activeReminders = [], quickReminders = [] }) {
  const liveNotes = activeNotes(notes)
  const pending = todos.filter(t => t.status === 'pending').length
  const inProgress = todos.filter(t => t.status === 'in-progress').length
  const done = todos.filter(t => t.status === 'done').length
  const cancelled = todos.filter(t => t.status === 'cancelled').length

  const doneToday = todos.filter(t => {
    const at = getTodoCompletedAt(t)
    return at && isToday(at)
  }).length

  const withDueDate = todos.filter(t => t.dueDate && t.status !== 'done' && t.status !== 'cancelled')
  const dueToday = withDueDate.filter(t => isToday(new Date(t.dueDate))).length
  const overdue = withDueDate.filter(t => isTodoOverdue(t)).length

  const todoReminders = todos.filter(t => t.reminder?.enabled).length
  const noteReminders = liveNotes.filter(n => n.reminder?.enabled).length
  const quickActive = quickReminders.filter(r => r.reminder?.enabled).length
  const quickTotal = quickReminders.length
  const activeReminderCount = activeReminders.length || (todoReminders + noteReminders + quickActive)

  const canvasNotes = liveNotes.filter(n => isCanvasNote(n)).length
  const markdownNotes = liveNotes.length - canvasNotes
  const localNotes = liveNotes.filter(n => !n.cloudSync).length
  const driveNotes = liveNotes.filter(n => n.cloudSync).length
  const calendarNotes = liveNotes.filter(n => n.calendarDate).length
  const todayKey = todayDateString()
  const calendarToday = liveNotes.filter(n => n.calendarDate === todayKey).length
  const pinnedNotes = liveNotes.filter(n => n.pinned).length

  const highPriority = todos.filter(
    t => t.priority === 'high' && t.status !== 'done' && t.status !== 'cancelled'
  ).length

  return {
    todos: {
      total: todos.length,
      pending,
      inProgress,
      done,
      cancelled,
      doneToday,
      dueToday,
      overdue,
      highPriority,
      withDueDate: withDueDate.length,
    },
    notes: {
      total: liveNotes.length,
      markdown: markdownNotes,
      canvas: canvasNotes,
      local: localNotes,
      drive: driveNotes,
      calendar: calendarNotes,
      calendarToday,
      pinned: pinnedNotes,
      folders: folders.length,
    },
    reminders: {
      active: activeReminderCount,
      todos: todoReminders,
      notes: noteReminders,
      quick: quickActive,
      quickTotal,
    },
  }
}
