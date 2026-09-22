import { format } from 'date-fns'
import { getStatusLabel, getPriorityLabel } from './reminderMessages'
import {
  getTodoCompletedAt,
  getTodoCancelledAt,
  getTodoCreatedAt,
} from './todoActivityReport'

const isElectron = typeof window !== 'undefined' && window.api?.isElectron

async function downloadTextFile(filename, content, mimeType) {
  if (isElectron && window.api?.dialog?.saveFile && window.api?.fs?.writeFile) {
    const ext = filename.split('.').pop()
    const path = await window.api.dialog.saveFile({
      defaultPath: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!path) return { ok: false, cancelled: true }
    const result = await window.api.fs.writeFile(path, content)
    return result?.ok === false ? { ok: false, error: result.error } : { ok: true, path }
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { ok: true }
}

function formatDateTime(date) {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd HH:mm')
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

function reportFilename(report, ext) {
  const { start, period } = report.range
  const stamp = period === 'month' ? format(start, 'yyyy-MM') : format(start, 'yyyy-MM-dd')
  return `otdo-todo-report-${stamp}.${ext}`
}

function rangeLabel(report) {
  const { start, period } = report.range
  return period === 'month' ? format(start, 'MMMM yyyy') : format(start, 'MMM d, yyyy')
}

function flattenReportRows(report) {
  const rows = []
  for (const todo of report.created) {
    rows.push({
      event: 'created',
      eventAt: getTodoCreatedAt(todo),
      todo,
    })
  }
  for (const todo of report.completed) {
    rows.push({
      event: 'completed',
      eventAt: getTodoCompletedAt(todo),
      todo,
    })
  }
  for (const todo of report.cancelled) {
    rows.push({
      event: 'cancelled',
      eventAt: getTodoCancelledAt(todo),
      todo,
    })
  }
  rows.sort((a, b) => (b.eventAt?.getTime() || 0) - (a.eventAt?.getTime() || 0))
  return rows
}

export function buildTodoReportCsv(report) {
  const header = [
    'event',
    'event_at',
    'title',
    'status',
    'priority',
    'due_date',
    'created_at',
    'completed_at',
    'cancelled_at',
    'id',
  ]
  const lines = [header.join(',')]
  for (const row of flattenReportRows(report)) {
    const t = row.todo
    lines.push([
      row.event,
      formatDateTime(row.eventAt),
      csvEscape(t.title || ''),
      t.status || '',
      t.priority || '',
      formatDateTime(t.dueDate ? new Date(t.dueDate) : null),
      formatDateTime(getTodoCreatedAt(t)),
      formatDateTime(getTodoCompletedAt(t)),
      formatDateTime(getTodoCancelledAt(t)),
      t.id || '',
    ].join(','))
  }
  return lines.join('\n')
}

function mdList(title, todos, getDate) {
  const lines = [`### ${title} (${todos.length})`, '']
  if (!todos.length) {
    lines.push('_None_', '')
    return lines
  }
  for (const todo of todos) {
    const when = formatDateTime(getDate(todo))
    const meta = [
      getStatusLabel(todo.status),
      getPriorityLabel(todo.priority),
      when,
    ].filter(Boolean).join(' · ')
    lines.push(`- **${todo.title?.trim() || 'Untitled'}** — ${meta}`)
  }
  lines.push('')
  return lines
}

export function buildTodoReportMarkdown(report) {
  const label = rangeLabel(report)
  const periodLabel = report.range.period === 'month' ? 'Monthly' : 'Daily'
  const lines = [
    `# OTDO Todo Report — ${periodLabel}`,
    '',
    `**Period:** ${label}`,
    '',
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Created | ${report.counts.created} |`,
    `| Completed | ${report.counts.completed} |`,
    `| Cancelled | ${report.counts.cancelled} |`,
    '',
    ...mdList('Created', report.created, getTodoCreatedAt),
    ...mdList('Completed', report.completed, getTodoCompletedAt),
    ...mdList('Cancelled', report.cancelled, getTodoCancelledAt),
  ]
  return lines.join('\n')
}

export async function exportTodoActivityReport(report, formatType = 'csv') {
  if (formatType === 'md' || formatType === 'markdown') {
    const content = buildTodoReportMarkdown(report)
    return downloadTextFile(reportFilename(report, 'md'), content, 'text/markdown;charset=utf-8')
  }
  const content = buildTodoReportCsv(report)
  return downloadTextFile(reportFilename(report, 'csv'), content, 'text/csv;charset=utf-8')
}

export { rangeLabel }
