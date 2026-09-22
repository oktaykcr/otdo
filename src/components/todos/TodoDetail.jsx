import { useState } from 'react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Pencil, Trash2, Calendar, Clock,
  CheckCircle, Circle, XCircle, AlertCircle, Tag, Bell,
} from 'lucide-react'
import ColorTag from '../common/ColorTag'
import useTodoStore from '../../store/todoStore'
import TodoForm from './TodoForm'
import ReminderForm from './ReminderForm'
import { TODO_STATUS } from '../../lib/todoStatus'

const STATUS_CONFIG = {
  pending:     { icon: Circle,       ...TODO_STATUS.pending },
  'in-progress': { icon: AlertCircle, ...TODO_STATUS['in-progress'] },
  done:        { icon: CheckCircle,  ...TODO_STATUS.done },
  cancelled:   { icon: XCircle,      ...TODO_STATUS.cancelled },
}

const PRIORITY_COLORS = {
  high: 'text-priority-high',
  medium: 'text-priority-medium',
  low: 'text-priority-low',
}

export default function TodoDetail({ todoId }) {
  const todos = useTodoStore(s => s.todos)
  const updateTodo = useTodoStore(s => s.updateTodo)
  const deleteTodo = useTodoStore(s => s.deleteTodo)
  const selectTodo = useTodoStore(s => s.selectTodo)

  const [editing, setEditing] = useState(false)

  const todo = todos.find(t => t.id === todoId)
  if (!todo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-faint gap-3">
        <CheckCircle size={48} strokeWidth={1} />
        <p className="text-body-md">Select a task to view details</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[todo.status] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const statusColor = {
    pending: 'text-text-faint',
    'in-progress': 'text-accent',
    done: 'text-status-done',
    cancelled: 'text-status-cancelled',
  }[todo.status] || 'text-text-faint'

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return
    await deleteTodo(todo.id)
    selectTodo(null)
  }

  const cycleStatus = async () => {
    const order = ['pending', 'in-progress', 'done']
    const idx = order.indexOf(todo.status)
    const next = order[(idx + 1) % order.length]
    await updateTodo(todo.id, { status: next })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              onClick={cycleStatus}
              title="Click to cycle status"
              className={`${statusColor} hover:opacity-70 transition-opacity`}
            >
              <StatusIcon size={20} strokeWidth={1.75} />
            </button>
            <h1 className={`text-headline-md break-words ${statusCfg.title}`}>
              {todo.title}
            </h1>
            {todo.tag && <ColorTag tag={todo.tag} />}
          </div>

          {/* Priority */}
          <span className={`text-body-sm font-medium ${PRIORITY_COLORS[todo.priority]}`}>
            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} priority
          </span>
        </div>

        <div className="flex gap-1 flex-none">
          <button onClick={() => setEditing(true)} className="btn-ghost btn-icon" title="Edit">
            <Pencil size={16} />
          </button>
          <button onClick={handleDelete} className="btn-ghost btn-icon text-tag-important hover:bg-tag-important/10" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Dates */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Start', value: todo.startDate },
            { label: 'Due', value: todo.dueDate, warn: true },
            { label: 'Cancelled', value: todo.cancelDate },
          ].map(({ label, value, warn }) => (
            <div key={label} className="bg-surface2 rounded-lg p-3">
              <div className="text-label text-text-faint mb-1">{label}</div>
              <div className={`text-body-sm font-medium ${value && warn && new Date(value) < new Date() && todo.status !== 'done' ? 'text-tag-important' : 'text-text'}`}>
                {value ? format(new Date(value), 'MMM d, yyyy HH:mm') : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {todo.description ? (
          <div>
            <div className="text-label text-text-faint mb-3">Description</div>
            <div className="prose-dark bg-surface2 rounded-xl p-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-headline-md text-text mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-headline-sm text-text mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-body-lg font-semibold text-text mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-body-md text-text-muted mb-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-text-muted space-y-1 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-text-muted space-y-1 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="text-body-md">{children}</li>,
                  code: ({ inline, children }) => inline
                    ? <code className="bg-primary text-accent font-mono text-body-sm px-1.5 py-0.5 rounded">{children}</code>
                    : <pre className="bg-primary border border-border rounded-lg p-3 overflow-x-auto"><code className="text-body-sm font-mono text-text-muted">{children}</code></pre>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 text-text-muted italic my-3">{children}</blockquote>,
                  a: ({ href, children }) => <a href={href} className="text-accent hover:text-accent-hover underline">{children}</a>,
                  strong: ({ children }) => <strong className="text-text font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-text-muted italic">{children}</em>,
                }}
              >
                {todo.description}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-text-faint">
            <p className="text-body-sm">No description. Click edit to add details.</p>
          </div>
        )}

        <div className="bg-surface2 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-accent" />
            <span className="text-label text-text-faint">Reminder</span>
          </div>
          <ReminderForm
            value={todo.reminder}
            onChange={(reminder) => updateTodo(todo.id, { reminder })}
          />
        </div>

        {/* Timestamps */}
        <div className="flex gap-4 text-label text-text-faint pt-2 border-t border-border">
          <span>Created {format(new Date(todo.createdAt), 'MMM d, yyyy')}</span>
          <span>Updated {format(new Date(todo.updatedAt), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Edit modal */}
      <TodoForm
        open={editing}
        onClose={() => setEditing(false)}
        initial={todo}
      />
    </div>
  )
}
