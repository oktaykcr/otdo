export const PERSIST_STATUS = {
  IDLE: 'idle',
  OPENING: 'opening',
  CREATING: 'creating',
  SAVING: 'saving',
  SYNCING: 'syncing',
  SAVED: 'saved',
  ERROR: 'error',
}

export function isPersistBusy(status) {
  return [
    PERSIST_STATUS.OPENING,
    PERSIST_STATUS.CREATING,
    PERSIST_STATUS.SAVING,
    PERSIST_STATUS.SYNCING,
  ].includes(status)
}

export function persistStatusLabel(status, error, { cloudSync = false } = {}) {
  switch (status) {
    case PERSIST_STATUS.OPENING: return 'Opening…'
    case PERSIST_STATUS.CREATING: return 'Creating note…'
    case PERSIST_STATUS.SAVING: return cloudSync ? null : 'Saving…'
    case PERSIST_STATUS.SYNCING: return 'Syncing…'
    case PERSIST_STATUS.SAVED: return cloudSync ? 'Synced' : 'Saved'
    case PERSIST_STATUS.ERROR: return error || (cloudSync ? 'Sync failed' : 'Save failed')
    default: return null
  }
}

export function editorActionLabel({ cloudSync, isDirty, persistStatus, persistError }) {
  if (isPersistBusy(persistStatus)) {
    return persistStatusLabel(persistStatus, persistError, { cloudSync }) || (cloudSync ? 'Syncing…' : 'Saving…')
  }
  if (cloudSync) return 'Sync'
  return isDirty ? 'Save' : 'Saved'
}

export function msToDelaySeconds(ms) {
  return ms ? ms / 1000 : 0
}

export function delaySecondsToMs(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 1000)
}

export function formatDelaySecondsInput(ms) {
  if (!ms) return '0'
  const s = ms / 1000
  return Number.isInteger(s) ? String(s) : String(s)
}
