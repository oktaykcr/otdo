import { extractTodoIdsFromMarkdown, filterTodosForTelegram, formatTelegramTodoEntry } from './telegramTodos'
import { getStatusLabel, getPriorityLabel } from './reminderMessages'

export const NOTE_REMINDER_PREFIX = 'note:'

export function noteReminderId(noteId) {
  return `${NOTE_REMINDER_PREFIX}${noteId}`
}

export function isNoteReminderId(id) {
  return String(id).startsWith(NOTE_REMINDER_PREFIX)
}

export function parseNoteReminderId(id) {
  return isNoteReminderId(id) ? id.slice(NOTE_REMINDER_PREFIX.length) : null
}

export function getNoteTodosFromContent(content, todos) {
  const ids = extractTodoIdsFromMarkdown(content)
  return filterTodosForTelegram(todos, ids)
}

export function buildNoteReminderNotificationContent(note, noteTodos) {
  const noteTitle = note?.name?.trim() || 'Untitled'
  const count = noteTodos.length

  if (count === 0) {
    return {
      notificationTitle: noteTitle,
      notificationSubtitle: 'Note reminder',
      notificationBody: 'No open tasks in this note.',
      telegramText: `⏰ <b>OTDO Reminder</b>\n\n<b>${escapeHtml(noteTitle)}</b>\n\nNo open tasks.`,
    }
  }

  const lines = noteTodos.map((todo, i) => {
    const title = todo.title?.trim() || 'Untitled'
    const parts = [getStatusLabel(todo.status), getPriorityLabel(todo.priority)]
    return `${i + 1}. ${title} (${parts.join(' · ')})`
  })

  const notificationBody = lines.join('\n')
  const notificationSubtitle = `${count} open task${count === 1 ? '' : 's'}`
  const telegramBody = noteTodos
    .map((todo, i) => formatTelegramTodoEntry(todo, i + 1))
    .join('\n')
  const telegramText = `⏰ <b>OTDO Reminder</b>\n\n<b>${escapeHtml(noteTitle)}</b>\n\n${telegramBody}`

  return {
    notificationTitle: noteTitle,
    notificationSubtitle,
    notificationBody,
    telegramText,
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildNoteReminderScheduleConfig(note, noteTodos, settings = {}) {
  const { notificationTitle, notificationSubtitle, notificationBody, telegramText } =
    buildNoteReminderNotificationContent(note, noteTodos)

  return {
    scope: 'note',
    noteId: note.id,
    noteTitle: note.name,
    type: note.reminder.type,
    time: note.reminder.time,
    dayOfWeek: note.reminder.dayOfWeek ?? new Date().getDay(),
    at: note.reminder.at || null,
    todos: noteTodos.map(t => ({
      title: t.title,
      priority: t.priority || 'medium',
      status: t.status || 'pending',
      dueDate: t.dueDate || null,
    })),
    notificationTitle,
    notificationSubtitle,
    notificationBody,
    telegramText,
    telegramConfig: {
      enabled: !!note.reminder.telegram,
      botToken: settings.telegramBotToken || '',
      chatId: settings.telegramChatId || '',
    },
  }
}

export async function syncNoteReminder(note, content, todos, settings = {}) {
  if (!window.api?.reminder || !note?.id) return
  const id = noteReminderId(note.id)

  if (!note.reminder?.enabled) {
    await window.api.reminder.cancel(id)
    return
  }

  const noteTodos = getNoteTodosFromContent(content, todos)
  await window.api.reminder.schedule(
    id,
    buildNoteReminderScheduleConfig(note, noteTodos, settings)
  )
}

export function notesContainingTodo(notes, noteDrafts, activeNoteId, activeContent, todoId) {
  return notes.filter(note => {
    let content = ''
    if (note.id === activeNoteId && activeContent) {
      content = activeContent
    } else {
      content = noteDrafts[note.id]?.content || ''
    }
    if (!content) return false
    return extractTodoIdsFromMarkdown(content).has(todoId)
  })
}
