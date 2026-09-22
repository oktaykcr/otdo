import { noteFileName } from './noteCanvas'

export const TRASH_DIR_NAME = '.otdo-trash'
export const DEFAULT_TRASH_RETENTION_DAYS = 14

export const TRASH_RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
]

export function isNoteTrashed(note) {
  return Boolean(note?.deletedAt)
}

export function activeNotes(notes = []) {
  return notes.filter(n => !isNoteTrashed(n))
}

export function trashedNotes(notes = []) {
  return notes
    .filter(isNoteTrashed)
    .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
}

export function normalizeRetentionDays(days) {
  const n = Number(days)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TRASH_RETENTION_DAYS
  return Math.min(365, Math.floor(n))
}

export function trashExpiresAt(note, retentionDays) {
  if (!note?.deletedAt) return null
  const ms = normalizeRetentionDays(retentionDays) * 24 * 60 * 60 * 1000
  return new Date(note.deletedAt).getTime() + ms
}

export function isTrashExpired(note, retentionDays, now = Date.now()) {
  const expires = trashExpiresAt(note, retentionDays)
  return expires != null && now >= expires
}

export function daysUntilPurge(note, retentionDays, now = Date.now()) {
  const expires = trashExpiresAt(note, retentionDays)
  if (expires == null) return null
  return Math.max(0, Math.ceil((expires - now) / (24 * 60 * 60 * 1000)))
}

export function buildTrashNotePath(basePath, note) {
  if (!basePath || !note?.id) return null
  const fileName = noteFileName(note) || `${note.id}.md`
  return `${basePath}/${TRASH_DIR_NAME}/${note.id}/${fileName}`
}
