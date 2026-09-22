export const TODO_TITLE_DISPLAY_MAX = 50

export function isLongTodoTitle(title) {
  return (title?.trim().length || 0) > TODO_TITLE_DISPLAY_MAX
}

export function displayTodoTitle(title, max = TODO_TITLE_DISPLAY_MAX) {
  const trimmed = title?.trim() || ''
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export function applyLongTitleDescription({ title, description = '', previousTitle } = {}) {
  const nextTitle = title?.trim() || ''
  let nextDescription = description ?? ''

  if (!isLongTodoTitle(nextTitle)) {
    return { title: nextTitle, description: nextDescription }
  }

  const prevDesc = (description ?? '').trim()
  const wasAutoMirrored = previousTitle != null && prevDesc === String(previousTitle).trim()

  if (!prevDesc || wasAutoMirrored) {
    nextDescription = nextTitle
  }

  return { title: nextTitle, description: nextDescription }
}
