import { format } from 'date-fns'

export const CALENDAR_FOLDER_NAME = 'calendar'

export function toCalendarDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function calendarNoteTitle(date) {
  return format(date, 'MMM d, yyyy')
}

export function findNoteByCalendarDate(notes, date) {
  const key = toCalendarDateKey(date)
  return notes.find(n => n.calendarDate === key) || null
}

export function findCalendarFolder(folders) {
  return folders.find(f => !f.parentId && f.name === CALENDAR_FOLDER_NAME) || null
}
