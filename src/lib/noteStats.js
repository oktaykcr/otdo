export function computeNoteStats(content) {
  const text = content || ''
  const chars = text.length
  const lines = text ? text.split('\n').length : 0
  const bytes = new TextEncoder().encode(text).length
  return { chars, lines, bytes }
}

export function formatNoteSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
