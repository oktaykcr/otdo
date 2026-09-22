import { format } from 'date-fns'

export function getSlashDateTimeInsert(kind) {
  const now = new Date()
  switch (kind) {
    case 'today':
      return format(now, 'EEEE, MMMM d, yyyy')
    case 'date':
      return format(now, 'yyyy-MM-dd')
    case 'time':
      return format(now, 'HH:mm')
    default:
      return ''
  }
}
