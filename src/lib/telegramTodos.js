import { format, isToday } from 'date-fns'

const TODO_REF = /<!--todo:([a-f0-9-]+)-->/gi

const PRIORITY_EMOJI = { high: '🔴', medium: '🟡', low: '⚪' }

export function extractTodoIdsFromMarkdown(markdown) {
  const ids = new Set()
  if (!markdown) return ids
  for (const m of markdown.matchAll(TODO_REF)) ids.add(m[1])
  return ids
}

export async function collectLinkedTodoIds(notes, activeNoteId, activeContent) {
  const ids = new Set()
  const isElectron = typeof window !== 'undefined' && window.api?.isElectron

  for (const note of notes) {
    let content = ''
    if (note.id === activeNoteId && activeContent) {
      content = activeContent
    } else if (note.path && isElectron) {
      const r = await window.api.fs.readFile(note.path)
      if (r.ok) content = r.data
    } else {
      content = localStorage.getItem(`otdo-note-${note.id}`) || ''
    }
    extractTodoIdsFromMarkdown(content).forEach(id => ids.add(id))
  }
  return ids
}

export function filterTodosForTelegram(todos, linkedIds) {
  return todos.filter(t => {
    if (!t.title?.trim()) return false
    if (!linkedIds.has(t.id)) return false
    if (t.status === 'done' || t.status === 'cancelled') return false
    return true
  })
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatTodoDate(iso, withTime = false) {
  if (!iso) return null
  try {
    return format(new Date(iso), withTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy')
  } catch {
    return null
  }
}

export function filterTodosDueToday(todos) {
  return todos.filter(t => t.dueDate && isToday(new Date(t.dueDate)))
}

export function formatTelegramTodoEntry(todo, index) {
  const title = escapeHtml(todo.title.trim())
  const priorityKey = todo.priority || 'medium'
  const priorityLabel = priorityKey.charAt(0).toUpperCase() + priorityKey.slice(1)
  const priorityEmoji = PRIORITY_EMOJI[priorityKey] || '•'
  const created = formatTodoDate(todo.createdAt)
  const due = formatTodoDate(todo.dueDate, true)

  const parts = [`${priorityEmoji} ${priorityLabel}`]
  if (created) parts.push(created)
  if (due) parts.push(due)
  parts.push(`<b>${title}</b>`)

  return `${index}. ${parts.join(' · ')}`
}

export function buildTelegramTodoListMessage(todos, { title, emptyText, sortByDue = false }) {
  if (!todos.length) {
    return `${title}\n\n${emptyText}`
  }

  const sorted = [...todos].sort((a, b) => {
    if (sortByDue) {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  const body = sorted.map((t, i) => formatTelegramTodoEntry(t, i + 1)).join('\n')
  return `${title}\n\n${body}`
}
