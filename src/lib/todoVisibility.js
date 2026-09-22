export function shouldShowTodo(todo, showDoneTodos, showCancelledTodos) {
  if (!todo) return true
  if (!showDoneTodos && todo.status === 'done') return false
  if (!showCancelledTodos && todo.status === 'cancelled') return false
  return true
}

export function shouldShowTodoBlock(block, todos, showDoneTodos, showCancelledTodos) {
  if (block.type !== 'todo') return true
  if (!block.todoId) return true
  const todo = todos.find(t => t.id === block.todoId)
  if (!todo) return true
  return shouldShowTodo(todo, showDoneTodos, showCancelledTodos)
}
