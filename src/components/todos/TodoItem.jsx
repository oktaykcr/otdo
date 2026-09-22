import { format } from 'date-fns'
import { Calendar, ChevronRight } from 'lucide-react'
import ColorTag from '../common/ColorTag'
import { TODO_STATUS } from '../../lib/todoStatus'
import { displayTodoTitle } from '../../lib/todoTitle'

const PRIORITY_CLASSES = {
  high: 'border-l-priority-high',
  medium: 'border-l-priority-medium',
  low: 'border-l-priority-low',
}

export default function TodoItem({ todo, isSelected, onClick }) {
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== 'done' && todo.status !== 'cancelled'
  const statusCfg = TODO_STATUS[todo.status] || TODO_STATUS.pending

  return (
    <div
      onClick={onClick}
      className={`
        border-l-4 ${PRIORITY_CLASSES[todo.priority] || 'border-l-border'}
        bg-surface hover:bg-surface2
        rounded-r-xl p-4 cursor-pointer transition-all duration-150
        ${isSelected ? 'ring-1 ring-accent bg-accent/5' : ''}
        group
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-1 flex-none">
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusCfg.dot}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-body-md font-medium truncate ${statusCfg.title}`}
              title={todo.title}
            >
              {displayTodoTitle(todo.title)}
            </span>
            {todo.tag && <ColorTag tag={todo.tag} size="sm" />}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status */}
            <span className={`text-label px-1.5 py-0.5 rounded-md border ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>

            {/* Due date */}
            {todo.dueDate && (
              <span className={`flex items-center gap-1 text-body-sm ${isOverdue ? 'text-tag-important' : 'text-text-faint'}`}>
                <Calendar size={11} />
                {format(new Date(todo.dueDate), 'MMM d, HH:mm')}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={16}
          className={`text-text-faint transition-opacity mt-1 flex-none ${
            isSelected ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      </div>
    </div>
  )
}
