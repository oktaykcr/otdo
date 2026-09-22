const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'Active',
  done: 'Done',
  cancelled: 'Cancelled',
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDueDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getPriorityLabel(priority) {
  return PRIORITY_LABELS[priority] || PRIORITY_LABELS.medium
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || STATUS_LABELS.pending
}

function buildDetailLines(todo) {
  const lines = [`Priority: ${getPriorityLabel(todo?.priority)}`]
  const due = formatDueDate(todo?.dueDate)
  if (due) lines.push(`Due: ${due}`)
  return lines
}

function buildTelegramTextFromTodo(todo) {
  const title = todo?.title?.trim() || 'Untitled'
  const lines = buildDetailLines(todo)
  return (
    `⏰ <b>OTDO Reminder</b>\n\n` +
    `<b>${escapeHtml(title)}</b>\n` +
    lines.map(line => escapeHtml(line)).join('\n')
  )
}

export function buildReminderNotificationContent(todo) {
  const title = todo?.title?.trim() || 'Untitled'
  const lines = buildDetailLines(todo)
  const statusLine = todo?.status ? `Status: ${getStatusLabel(todo.status)}` : null
  const notificationLines = statusLine ? [statusLine, ...lines] : lines
  const notificationTitle = title
  const notificationBody = notificationLines.join('\n')
  const meta = [
    getPriorityLabel(todo?.priority),
    formatDueDate(todo?.dueDate),
  ].filter(Boolean).join(' · ')
  const notificationSubtitle = meta || 'Task reminder'
  const telegramText = buildTelegramTextFromTodo(todo)

  return { notificationTitle, notificationSubtitle, notificationBody, telegramText }
}
