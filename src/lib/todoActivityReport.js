import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
} from 'date-fns'

export function getTodoCompletedAt(todo) {
  if (todo.completedAt) {
    const d = parseISO(todo.completedAt)
    return isValid(d) ? d : null
  }
  if (todo.status === 'done' && todo.updatedAt) {
    const d = parseISO(todo.updatedAt)
    return isValid(d) ? d : null
  }
  return null
}

export function getTodoCancelledAt(todo) {
  if (todo.cancelDate) {
    const d = parseISO(todo.cancelDate)
    return isValid(d) ? d : null
  }
  if (todo.status === 'cancelled' && todo.updatedAt) {
    const d = parseISO(todo.updatedAt)
    return isValid(d) ? d : null
  }
  return null
}

export function getTodoCreatedAt(todo) {
  if (!todo.createdAt) return null
  const d = parseISO(todo.createdAt)
  return isValid(d) ? d : null
}

export function getReportRange(period, anchorDate = new Date()) {
  const anchor = anchorDate instanceof Date ? anchorDate : new Date(anchorDate)
  if (period === 'month') {
    return {
      start: startOfMonth(anchor),
      end: endOfMonth(anchor),
      period: 'month',
    }
  }
  return {
    start: startOfDay(anchor),
    end: endOfDay(anchor),
    period: 'day',
  }
}

function inRange(date, range) {
  if (!date) return false
  return isWithinInterval(date, { start: range.start, end: range.end })
}

function sortByDateDesc(items, getDate) {
  return [...items].sort((a, b) => {
    const da = getDate(a)?.getTime() || 0
    const db = getDate(b)?.getTime() || 0
    return db - da
  })
}

export function buildTodoActivityReport(todos = [], { period = 'day', anchorDate = new Date() } = {}) {
  const range = getReportRange(period, anchorDate)

  const created = sortByDateDesc(
    todos.filter(t => inRange(getTodoCreatedAt(t), range)),
    getTodoCreatedAt
  )
  const completed = sortByDateDesc(
    todos.filter(t => inRange(getTodoCompletedAt(t), range)),
    getTodoCompletedAt
  )
  const cancelled = sortByDateDesc(
    todos.filter(t => inRange(getTodoCancelledAt(t), range)),
    getTodoCancelledAt
  )

  return {
    range,
    created,
    completed,
    cancelled,
    counts: {
      created: created.length,
      completed: completed.length,
      cancelled: cancelled.length,
    },
  }
}
