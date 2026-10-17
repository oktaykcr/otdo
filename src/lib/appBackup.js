// Full app-state backup: everything in electron-store (todos, notesMeta, settings, gamification, ...).
// Note: the backup contains Drive/Telegram credentials stored in settings.
const FILTERS = [{ name: 'OTDO backup', extensions: ['json'] }]

export async function exportBackup() {
  const path = await window.api.dialog.saveFile({
    defaultPath: `otdo-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: FILTERS,
  })
  if (!path) return { ok: false, canceled: true }
  const data = await window.api.store.getAll()
  const r = await window.api.fs.writeFile(path, JSON.stringify({ otdoBackup: 1, data }, null, 2))
  return r.ok ? { ok: true, path } : { ok: false, error: r.error }
}

// Restores a backup. The current notes folder wins over the one in the backup,
// and note paths are rebased onto it so a backup moves between machines.
export async function importBackup() {
  const path = await window.api.dialog.openFile({ filters: FILTERS })
  if (!path) return { ok: false, canceled: true }
  const r = await window.api.fs.readFile(path)
  if (!r.ok) return { ok: false, error: r.error }

  let backup
  try { backup = JSON.parse(r.data) } catch { return { ok: false, error: 'Not a valid JSON file' } }
  const data = backup?.otdoBackup === 1 ? backup.data : null
  if (!data || typeof data !== 'object') return { ok: false, error: 'Not an OTDO backup file' }

  const current = (await window.api.store.get('settings')) || {}
  const oldBase = (data.settings?.notesPath || '').trim().replace(/[\\/]+$/, '')
  const newBase = (current.notesPath || '').trim().replace(/[\\/]+$/, '')
  if (data.settings) data.settings = { ...data.settings, notesPath: current.notesPath ?? data.settings.notesPath }
  if (oldBase && newBase && oldBase !== newBase && data.notesMeta?.notes) {
    data.notesMeta.notes = data.notesMeta.notes.map(n =>
      n.path?.startsWith(oldBase) ? { ...n, path: newBase + n.path.slice(oldBase.length) } : n)
  }

  for (const [key, value] of Object.entries(data)) await window.api.store.set(key, value)
  return { ok: true }
}
