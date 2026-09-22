import { useState } from 'react'
import { format } from 'date-fns'
import {
  CheckCircle2, Plus, XCircle, Download, ChevronDown, FileText, Table2,
} from 'lucide-react'
import { TODO_STATUS, TODO_PRIORITY } from '../../lib/todoStatus'
import {
  buildTodoActivityReport,
  getTodoCompletedAt,
  getTodoCancelledAt,
  getTodoCreatedAt,
} from '../../lib/todoActivityReport'
import { exportTodoActivityReport, rangeLabel } from '../../lib/todoReportExport'
import { displayTodoTitle } from '../../lib/todoTitle'

const PERIODS = [
  { value: 'day', label: 'Daily' },
  { value: 'month', label: 'Monthly' },
]

function formatEventTime(date) {
  if (!date) return '—'
  return format(date, 'MMM d, HH:mm')
}

function TodoReportRow({ todo, eventAt }) {
  const status = TODO_STATUS[todo.status] || TODO_STATUS.pending
  const priority = TODO_PRIORITY[todo.priority] || TODO_PRIORITY.medium

  return (
    <li className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none"
        style={{ backgroundColor: status.accent }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-text truncate">{displayTodoTitle(todo.title) || 'Untitled'}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-label text-text-faint">{status.label}</span>
          <span className="text-label" style={{ color: priority.color }}>{priority.label}</span>
          <span className="text-label text-text-faint tabular-nums">{formatEventTime(eventAt)}</span>
        </div>
      </div>
    </li>
  )
}

function ReportColumn({ icon: Icon, title, count, accent, iconBg, todos, getDate, emptyText }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/40 p-3.5 flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border flex-none">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={15} className={accent} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-body-sm font-semibold text-text truncate">{title}</h3>
          <p className="text-label text-text-faint tabular-nums">{count}</p>
        </div>
      </div>
      {todos.length === 0 ? (
        <p className="text-body-sm text-text-faint py-6 text-center">{emptyText}</p>
      ) : (
        <ul className="overflow-y-auto max-h-64 -mx-1 px-1">
          {todos.map(todo => (
            <TodoReportRow key={`${title}-${todo.id}`} todo={todo} eventAt={getDate(todo)} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DashboardActivityReport({ todos }) {
  const [period, setPeriod] = useState('day')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const report = buildTodoActivityReport(todos, { period })
  const label = rangeLabel(report)

  const handleExport = async (formatType) => {
    setExporting(true)
    setExportOpen(false)
    try {
      await exportTodoActivityReport(report, formatType)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface2 border border-border">
          {PERIODS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md text-label transition-colors ${
                period === p.value
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-label text-text-faint tabular-nums">{label}</span>

        <div className="ml-auto relative">
          <button
            type="button"
            disabled={exporting}
            onClick={() => setExportOpen(o => !o)}
            className="btn-secondary flex items-center gap-1.5 text-body-sm py-1.5 px-3"
          >
            <Download size={14} />
            Export
            <ChevronDown size={14} className="text-text-faint" />
          </button>
          {exportOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close export menu"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 card p-1 shadow-elevated space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-body-sm
                             text-text-muted hover:bg-surface2 hover:text-text transition-colors"
                >
                  <Table2 size={14} />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('md')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-body-sm
                             text-text-muted hover:bg-surface2 hover:text-text transition-colors"
                >
                  <FileText size={14} />
                  Markdown
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-surface2/40 py-3 text-center">
          <p className="text-headline-md text-text tabular-nums">{report.counts.created}</p>
          <p className="text-label text-text-muted mt-0.5">Created</p>
        </div>
        <div className="rounded-xl border border-border bg-surface2/40 py-3 text-center">
          <p className="text-headline-md text-status-done tabular-nums">{report.counts.completed}</p>
          <p className="text-label text-text-muted mt-0.5">Completed</p>
        </div>
        <div className="rounded-xl border border-border bg-surface2/40 py-3 text-center">
          <p className="text-headline-md text-status-cancelled tabular-nums">{report.counts.cancelled}</p>
          <p className="text-label text-text-muted mt-0.5">Cancelled</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ReportColumn
          icon={Plus}
          title="Created"
          count={report.counts.created}
          accent="text-accent"
          iconBg="bg-accent/15"
          todos={report.created}
          getDate={getTodoCreatedAt}
          emptyText="No todos created in this period"
        />
        <ReportColumn
          icon={CheckCircle2}
          title="Completed"
          count={report.counts.completed}
          accent="text-status-done"
          iconBg="bg-status-done/15"
          todos={report.completed}
          getDate={getTodoCompletedAt}
          emptyText="No todos completed in this period"
        />
        <ReportColumn
          icon={XCircle}
          title="Cancelled"
          count={report.counts.cancelled}
          accent="text-status-cancelled"
          iconBg="bg-status-cancelled/15"
          todos={report.cancelled}
          getDate={getTodoCancelledAt}
          emptyText="No todos cancelled in this period"
        />
      </div>
    </div>
  )
}
