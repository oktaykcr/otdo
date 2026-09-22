export function findEditorMatches(blocks, query, todos = [], noteTags = []) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const q = trimmed.toLowerCase()
  const matches = []

  if (blocks?.length) {
    blocks.forEach((block, blockIdx) => {
      collectInText(block.content || '', q, trimmed.length, blockIdx, 'content', matches)

      if (block.type === 'table' && block.rows) {
        block.rows.forEach((row, ri) => {
          row.forEach((cell, ci) => {
            collectInText(cell || '', q, trimmed.length, blockIdx, `cell-${ri}-${ci}`, matches)
          })
        })
      }

      if (block.type === 'todo' && block.todoId) {
        const todo = todos.find(t => t.id === block.todoId)
        collectInText(todo?.description || '', q, trimmed.length, blockIdx, 'description', matches)
      }
    })
  }

  noteTags.forEach((tag, tagIdx) => {
    collectInText(tag, q, trimmed.length, -1, `tag-${tagIdx}`, matches)
  })

  return matches
}

function collectInText(text, q, len, blockIdx, field, matches) {
  let pos = 0
  while (pos < text.length) {
    const idx = text.toLowerCase().indexOf(q, pos)
    if (idx === -1) break
    matches.push({ blockIdx, start: idx, end: idx + len, field })
    pos = idx + 1
  }
}
