import { format } from 'date-fns'

export function formatNoteDate(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function formatNoteDateTime(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'MMM d, yyyy HH:mm')
  } catch {
    return '—'
  }
}
