import { shouldShowTodo } from './todoVisibility'

export const NOTE_TODO_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const NOTE_TODO_SORT_OPTIONS = [
  { value: 'document', label: 'Document order' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'createdAt', label: 'Created' },
]

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function matchesNoteTodoFilter(todo, filter, showDoneTodos, showCancelledTodos) {
  if (!todo) return true
  if (filter !== 'all') return todo.status === filter
  return shouldShowTodo(todo, showDoneTodos, showCancelledTodos)
}

function compareTodoEntries(a, b, sortBy) {
  const ta = a.todo
  const tb = b.todo
  const tie = (a.blockIdx ?? 0) - (b.blockIdx ?? 0)

  if (sortBy === 'priority') {
    const pa = PRIORITY_ORDER[ta?.priority || 'medium'] ?? 1
    const pb = PRIORITY_ORDER[tb?.priority || 'medium'] ?? 1
    return pa !== pb ? pa - pb : tie
  }

  if (sortBy === 'dueDate') {
    if (!ta?.dueDate && !tb?.dueDate) return tie
    if (!ta?.dueDate) return 1
    if (!tb?.dueDate) return -1
    const diff = new Date(ta.dueDate) - new Date(tb.dueDate)
    return diff !== 0 ? diff : tie
  }

  if (sortBy === 'createdAt') {
    const ca = new Date(ta?.createdAt || 0).getTime()
    const cb = new Date(tb?.createdAt || 0).getTime()
    return ca !== cb ? cb - ca : tie
  }

  return tie
}

export function countNoteTodoBlocks(blocks) {
  return blocks?.filter(b => b.type === 'todo').length ?? 0
}

export function buildNoteTodoDisplayPlan(blocks, todos, options) {
  const { filter, sortBy, showDoneTodos, showCancelledTodos } = options

  const todoEntries = blocks
    .map((block, blockIdx) => ({
      block,
      blockIdx,
      todo: block.todoId ? todos.find(t => t.id === block.todoId) : null,
    }))
    .filter(({ block }) => block.type === 'todo')

  const visibleEntries = todoEntries.filter(({ todo }) =>
    matchesNoteTodoFilter(todo, filter, showDoneTodos, showCancelledTodos)
  )

  const sortedVisible = sortBy === 'document'
    ? visibleEntries
    : [...visibleEntries].sort((a, b) => compareTodoEntries(a, b, sortBy))

  const displayBySlot = new Map()
  visibleEntries.forEach((entry, i) => {
    displayBySlot.set(entry.blockIdx, sortedVisible[i].block)
  })

  const sourceIdxByBlockId = new Map(
    blocks.map((block, blockIdx) => [block.id, blockIdx])
  )

  return blocks.map((block, blockIdx) => {
    if (block.type !== 'todo') {
      return { displayBlock: block, blockIdx, sourceBlockIdx: blockIdx, hidden: false }
    }

    const todo = block.todoId ? todos.find(t => t.id === block.todoId) : null
    if (!matchesNoteTodoFilter(todo, filter, showDoneTodos, showCancelledTodos)) {
      return { displayBlock: block, blockIdx, sourceBlockIdx: blockIdx, hidden: true }
    }

    const displayBlock = displayBySlot.get(blockIdx) || block
    const sourceBlockIdx = sourceIdxByBlockId.get(displayBlock.id) ?? blockIdx

    return { displayBlock, blockIdx, sourceBlockIdx, hidden: false }
  })
}
